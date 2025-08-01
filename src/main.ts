import { once, showUI } from '@create-figma-plugin/utilities'
import { CloseHandler, SwitchAxisHandler } from './types'

export default function () {
  once<SwitchAxisHandler>('SWITCH_AXIS', function () {
    // --- Step 1: Get Selection ---
    const selection = figma.currentPage.selection
    const frame = selection[0] as FrameNode
    
    // --- Step 2: Identify Structure ---
    const isRowBased = frame.layoutMode === 'VERTICAL'
    const isColumnBased = frame.layoutMode === 'HORIZONTAL'

    // --- Step 3: Extract Cells into a Matrix ---
    const matrix: ComponentNode[][] = []
    let maxCols = 0;

    if (isRowBased) {
      const rows = frame.children as FrameNode[];
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        matrix[rowIndex] = [];
        if (row.children.length > maxCols) {
            maxCols = row.children.length;
        }
        for (let cellIndex = 0; cellIndex < row.children.length; cellIndex++) {
          matrix[rowIndex][cellIndex] = (row.children[cellIndex] as any).clone();
        }
      }
    } else if (isColumnBased) {
      const columns = frame.children as FrameNode[];
      maxCols = columns.length;
      for (let colIndex = 0; colIndex < columns.length; colIndex++) {
        const column = columns[colIndex];
        for (let cellIndex = 0; cellIndex < column.children.length; cellIndex++) {
          if (!matrix[cellIndex]) {
            matrix[cellIndex] = [];
          }
          matrix[cellIndex][colIndex] = (column.children[cellIndex] as any).clone();
        }
      }
    }

    // --- Step 4: Reconstruct the Table ---
    // Clear the original frame
    frame.children.forEach(child => child.remove())

    if (isRowBased) {
      // Switch to Column-based
      frame.layoutMode = 'HORIZONTAL'
      frame.layoutSizingHorizontal = 'HUG'
      frame.layoutSizingVertical = 'HUG'
      
              for (let colIndex = 0; colIndex < maxCols; colIndex++) {
          const newColumn = figma.createFrame()
          newColumn.name = `Column ${colIndex + 1}`
          newColumn.layoutMode = 'VERTICAL'
          newColumn.layoutSizingVertical = 'HUG'
          newColumn.fills = [] // Make background transparent
          
          // Set column width to match the first cell in that column
          if (matrix[0] && matrix[0][colIndex]) {
            newColumn.resize(matrix[0][colIndex].width, newColumn.height)
          }

        for (let rowIndex = 0; rowIndex < matrix.length; rowIndex++) {
          if (matrix[rowIndex] && matrix[rowIndex][colIndex]) {
            // Clone the cell to prevent auto-adjustment and erroneous self references
            const cell = matrix[rowIndex][colIndex].clone();
            newColumn.appendChild(cell)
            // Explicitly set layout properties after append to prevent auto-adjustment (FIGMA QUIRK)
            cell.layoutSizingVertical = matrix[rowIndex][colIndex].layoutSizingVertical
            cell.resize(matrix[rowIndex][colIndex].width, matrix[rowIndex][colIndex].height)
            cell.layoutSizingHorizontal = 'FILL'
          }
        }
        frame.appendChild(newColumn)
      }
    } else if (isColumnBased) {
      // Switch to Row-based
      frame.layoutMode = 'VERTICAL'
      
      for (let rowIndex = 0; rowIndex < matrix.length; rowIndex++) {
        const newRow = figma.createFrame()
        newRow.name = `Row ${rowIndex + 1}`
        newRow.layoutMode = 'HORIZONTAL'
        newRow.layoutSizingVertical = 'HUG'
        newRow.fills = [] // Make background transparent

        for (let colIndex = 0; colIndex < (matrix[rowIndex]?.length || 0); colIndex++) {
          // Clone the cell to prevent auto-adjustment and erroneous self references
          const cell = matrix[rowIndex][colIndex].clone();
          newRow.appendChild(cell)
          
          // Explicitly set layout properties after append to prevent auto-adjustment (FIGMA QUIRK)
          cell.layoutSizingVertical = matrix[rowIndex][colIndex].layoutSizingVertical
          cell.layoutSizingHorizontal = matrix[rowIndex][colIndex].layoutSizingHorizontal
          cell.resize(matrix[rowIndex][colIndex].width, matrix[rowIndex][colIndex].height)
          

        }
        frame.appendChild(newRow)
      }
    }
    
    figma.closePlugin('Table axis switched.')
  })
  
  once<CloseHandler>('CLOSE', function () {
    figma.closePlugin()
  })
  
  showUI({
    height: 124,
    width: 240
  })
}