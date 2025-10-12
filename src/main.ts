import { once, showUI } from '@create-figma-plugin/utilities'
import { CloseHandler, SwitchAxisHandler } from './types'

const absoluteChildren: BaseNode[] = []

export default function () {

  once<SwitchAxisHandler>('SWITCH_AXIS', function () {
    try {
      const selectedFrame = validateSelection()
      const { matrix, maxCols, isRowBased } = buildCellMatrix(selectedFrame)
      validateMatrix(matrix, maxCols, isRowBased)
      reconstructTable(selectedFrame, matrix, maxCols, isRowBased)
      figma.closePlugin('✅ Axis switched to ' + (isRowBased ? 'column' : 'row') + 's.')
    } catch (error) {
      figma.closePlugin(`❌ ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  })
  
  once<CloseHandler>('CLOSE', function () {
    figma.closePlugin()
  })
  
  showUI({
    height: 124,
    width: 240
  })
}

// --- Validation ---
function validateSelection(): FrameNode {
  const selection = figma.currentPage.selection
  
  if (selection.length === 0) {
    throw new Error('Please select a frame to switch axes.')
  }
  
  if (selection.length > 1) {
    throw new Error('Please select only one frame to switch axes.')
  }
  
  const selectedNode = selection[0]

  if (selectedNode.type === 'COMPONENT') {
    throw new Error('Please detach the component instance first.')
  }

  if (selectedNode.type !== 'FRAME') {
    throw new Error('Please select a frame to switch axes.')
  }
  
  const selectedFrame = selectedNode as FrameNode
  
  if (selectedFrame.layoutMode === 'NONE') {
    throw new Error('The selected Frame must have auto layout enabled.')
  }
  
  if (selectedFrame.children.length === 0) {
    throw new Error('The selected Frame must contain at least one child element.')
  }
  
  return selectedFrame
}

// --- Matrix Building ---
function buildCellMatrix(selectedFrame: FrameNode): { matrix: ComponentNode[][], maxCols: number, isRowBased: boolean } {
  const isRowBased = selectedFrame.layoutMode === 'VERTICAL'
  const isColumnBased = selectedFrame.layoutMode === 'HORIZONTAL'
  const matrix: ComponentNode[][] = []
  let maxCols = 0

  // Check each child for absolute positioning, and clean up matrix
  selectedFrame.children.forEach(child => {
    if ((child as any).layoutPositioning == 'ABSOLUTE') {
      absoluteChildren.push((child as any).clone())
      child.remove()
    }
  })
  
  
  if (isRowBased) {
    const rows = selectedFrame.children as FrameNode[]
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const currentRow = rows[rowIndex]
      matrix[rowIndex] = []
      if (currentRow.children.length > maxCols) {
        maxCols = currentRow.children.length
      }
      for (let cellIndex = 0; cellIndex < currentRow.children.length; cellIndex++) {
        matrix[rowIndex][cellIndex] = (currentRow.children[cellIndex] as any)
 
        // cheap way that modifies each cell in a hidden column to hidden even though it could be technically visible in the layer. Could be resolved in other ways
        if (!currentRow.visible) {
          matrix[rowIndex][cellIndex].visible = false
        }
        
      }
    }
  } else if (isColumnBased) {
    const columns = selectedFrame.children as FrameNode[]
    maxCols = columns.length

    for (let colIndex = 0; colIndex < columns.length; colIndex++) {
      const column = columns[colIndex]

      for (let cellIndex = 0; cellIndex < column.children.length; cellIndex++) {
        if (!matrix[cellIndex]) {
          matrix[cellIndex] = []
        }

        matrix[cellIndex][colIndex] = (column.children[cellIndex] as any)
        // cheap way that modifies each cell in a hidden column to hidden even though it could be technically visible in the layer. Could be resolved in other ways
        if (!column.visible) {
          matrix[cellIndex][colIndex].visible = false
        }
        
      }
    }
  }

  return { matrix, maxCols, isRowBased }
}

// --- Matrix Validation ---
function validateMatrix(matrix: ComponentNode[][], maxCols: number, isRowBased: boolean): void {
  if (!matrix || matrix.length === 0) {
    throw new Error('Matrix is empty or undefined.')
  }

  // Check for missing cells in the matrix
  const missingCells: string[] = []
  
  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex++) {
    const row = matrix[rowIndex]
    if (!row) {
      missingCells.push(`Row ${rowIndex + 1} is completely missing`)
      continue
    }
    
    for (let colIndex = 0; colIndex < maxCols; colIndex++) {
      if (!row[colIndex]) {
        missingCells.push(`(${rowIndex + 1}, ${colIndex + 1})`)
      }
    }
  }

  if (missingCells.length > 0) {
    const layoutType = isRowBased ? 'row' : 'column'
    throw new Error(
      `Invalid table structure: each ${layoutType} must have the same number of cells.` + `    `+ `Missing cells:\n` +
      missingCells.slice(0, 5).join('\n') + 
      (missingCells.length > 5 ? `\n... and ${missingCells.length - 5} more missing cells` : '')
    )
  }
}

// --- Table Reconstruction ---
function reconstructTable(selectedFrame: FrameNode, matrix: ComponentNode[][], maxCols: number, isRowBased: boolean): void {
  // Clear the original Frame
  const newFrame = figma.createFrame();
  newFrame.fills = selectedFrame.fills // Preserve the original background color

  if (isRowBased) {
    buildColumnBasedLayout(newFrame, matrix, maxCols)
  } else {
    buildRowBasedLayout(newFrame, matrix)
  }
  
  // Re-insert absolute positioned items
  absoluteChildren.forEach(item => {
    const clonedItem = (item as any).clone()
    newFrame.appendChild(clonedItem)
    // Preserve absolute positioning
    if ((clonedItem as any).layoutPositioning) {
      (clonedItem as any).layoutPositioning = 'ABSOLUTE'
    }
  })
  
  // Rename the Frame to "Table"
  newFrame.name = "Table"
  replaceFrame(selectedFrame, newFrame)
}

function buildColumnBasedLayout(selectedFrame: FrameNode, matrix: ComponentNode[][], maxCols: number): void {
  // Switch to Column-based
  selectedFrame.layoutMode = 'HORIZONTAL'
  selectedFrame.layoutSizingHorizontal = 'HUG'
  selectedFrame.layoutSizingVertical = 'HUG'
  
  for (let colIndex = 0; colIndex < maxCols; colIndex++) {
    const newColumn = figma.createFrame()
    newColumn.name = `Column ${colIndex + 1}`
    newColumn.layoutMode = 'VERTICAL'
    newColumn.layoutSizingVertical = 'HUG'
    newColumn.fills = [] // Make background transparent, otherwise sets to #FFFFFF by default
    
    // Set column width to match the first cell in that column, 
    if (matrix[0] && matrix[0][colIndex]) {
      newColumn.resize(matrix[0][colIndex].width, newColumn.height)
    }

    for (let rowIndex = 0; rowIndex < matrix.length; rowIndex++) {
      if (matrix[rowIndex] && matrix[rowIndex][colIndex]) {
        // Clone the cell to prevent auto-adjustment and erroneous self references
        const cell = matrix[rowIndex][colIndex].clone()
        newColumn.appendChild(cell)
        // Explicitly set layout properties after append to prevent auto-adjustment (FIGMA QUIRK)
        cell.layoutSizingVertical = matrix[rowIndex][colIndex].layoutSizingVertical
        cell.resize(matrix[rowIndex][colIndex].width, matrix[rowIndex][colIndex].height)
        cell.layoutSizingHorizontal = 'FILL'
        cell.visible = matrix[rowIndex][colIndex].visible
      }
    }
    newColumn.expanded = false
    // Check to see if all child cells in the newColumn are hidden
    newColumn.visible = !(newColumn.children.every(child => !child.visible))
    
    selectedFrame.appendChild(newColumn)

  }
}

function buildRowBasedLayout(selectedFrame: FrameNode, matrix: ComponentNode[][]): void {
  // Switch to Row-based
  selectedFrame.layoutMode = 'VERTICAL'
  selectedFrame.layoutSizingVertical = 'HUG'
  selectedFrame.layoutAlign = 'STRETCH';
  selectedFrame.layoutGrow = 1;
  
  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex++) {
    const newRow = figma.createFrame()
    newRow.name = `Row ${rowIndex + 1}`
    newRow.layoutMode = 'HORIZONTAL'
    newRow.layoutSizingVertical = 'HUG'
    newRow.fills = [] // Make background transparent

    for (let colIndex = 0; colIndex < (matrix[rowIndex]?.length || 0); colIndex++) {
      // Clone the cell to prevent auto-adjustment and erroneous self references
      const cell = matrix[rowIndex][colIndex].clone()
      cell.visible = matrix[rowIndex][colIndex].visible
      newRow.appendChild(cell)
      
      // Explicitly set layout properties after append to prevent auto-adjustment (FIGMA QUIRK)
      cell.layoutSizingVertical = matrix[rowIndex][colIndex].layoutSizingVertical
      cell.layoutSizingHorizontal = matrix[rowIndex][colIndex].layoutSizingHorizontal
      cell.resize(matrix[rowIndex][colIndex].width, matrix[rowIndex][colIndex].height)
    }
    newRow.expanded = false
    // Check to see if all child cells in the newRow are hidden
    newRow.visible = !(newRow.children.every(child => !child.visible))


    selectedFrame.appendChild(newRow)
    newRow.layoutSizingHorizontal = 'FILL'
  }
}

// Basic replacement - preserving position and size
function replaceFrame(oldFrame: FrameNode, newFrame: FrameNode) {
  // Get the parent and the index of the old frame
  const parent = oldFrame.parent;
  if (!parent) throw new Error('Frame has no parent');
  const index = parent.children.indexOf(oldFrame);
  
  // Copy position and size from old frame to new frame
  newFrame.x = oldFrame.x;
  newFrame.y = oldFrame.y;
  newFrame.resize(oldFrame.width, oldFrame.height);
  
  // Insert new frame at the same position in the parent
  parent.insertChild(index, newFrame);
  
  // Remove the old frame
  oldFrame.remove();
  
  return newFrame;
}