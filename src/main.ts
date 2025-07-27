import { once, showUI } from '@create-figma-plugin/utilities'

import { CloseHandler, SwitchAxisHandler } from './types'

export default function () {
  once<SwitchAxisHandler>('SWITCH_AXIS', function () {
    // Step 1: Validation
    const selection = figma.currentPage.selection
    
    // Check if exactly one item is selected
    if (selection.length !== 1) {
      console.error('Please select exactly one table frame to switch axis')
      return
    }
    
    const selectedNode = selection[0]
    
    // Check if the selected item is a FrameNode with Auto Layout enabled
    if (selectedNode.type !== 'FRAME') {
      console.error('Please select a frame (table container) to switch axis')
      return
    }
    
    const frame = selectedNode as FrameNode
    
    if (!frame.layoutMode) {
      console.error('Selected frame must have Auto Layout enabled')
      return
    }
    
    // Check if the selected item has children (these are the "Rows" or "Columns")
    if (frame.children.length === 0) {
      console.error('Selected frame must have children (rows or columns)')
      return
    }
    
    // Check if each of these children is also a FrameNode with Auto Layout enabled
    for (let i = 0; i < frame.children.length; i++) {
      const child = frame.children[i]
      
      if (child.type !== 'FRAME') {
        console.error(`Child ${i + 1} must be a frame (row or column)`)
        return
      }
      
      const childFrame = child as FrameNode
      
      if (!childFrame.layoutMode) {
        console.error(`Child ${i + 1} must have Auto Layout enabled`)
        return
      }
    }
    
    console.log('Validation passed! Selected frame is a valid table structure')
    
    // Step 2: Structure Identification
    const isRowBased = frame.layoutMode === 'VERTICAL'
    const isColumnBased = frame.layoutMode === 'HORIZONTAL'
    
    console.log(`Table structure identified: ${isRowBased ? 'Row-based' : 'Column-based'}`)
    
    // Step 3: Data Extraction (Matrix Transposition)
    const matrix: SceneNode[][] = []
    
    if (isRowBased) {
      // If Row-based: Iterate through each "Row" child. For each "Row", iterate through its children ("Cells")
      for (let rowIndex = 0; rowIndex < frame.children.length; rowIndex++) {
        const row = frame.children[rowIndex] as FrameNode
        matrix[rowIndex] = []
        
        for (let cellIndex = 0; cellIndex < row.children.length; cellIndex++) {
          const cell = row.children[cellIndex]
          // Clone the cell to preserve it after removal
          const clonedCell = (cell as any).clone()
          matrix[rowIndex][cellIndex] = clonedCell
        }
      }
    } else if (isColumnBased) {
      // If Column-based: Iterate through each "Column" child. For each "Column", iterate through its children ("Cells")
      for (let colIndex = 0; colIndex < frame.children.length; colIndex++) {
        const column = frame.children[colIndex] as FrameNode
        
        for (let cellIndex = 0; cellIndex < column.children.length; cellIndex++) {
          const cell = column.children[cellIndex]
          
          // Initialize row if it doesn't exist
          if (!matrix[cellIndex]) {
            matrix[cellIndex] = []
          }
          
          // Clone the cell to preserve it after removal
          const clonedCell = (cell as any).clone()
          // Transpose during insertion: matrix[rowIndex][columnIndex] = cellNode
          matrix[cellIndex][colIndex] = clonedCell
        }
      }
    }
    
    console.log('Matrix extracted:', matrix)
    console.log(`Matrix dimensions: ${matrix.length} rows x ${matrix[0]?.length || 0} columns`)
    
    // Step 4: Reconstruction
    // Store original properties for copying
    const originalItemSpacing = frame.itemSpacing
    const originalPaddingLeft = frame.paddingLeft
    const originalPaddingRight = frame.paddingRight
    const originalPaddingTop = frame.paddingTop
    const originalPaddingBottom = frame.paddingBottom
    
    // Clear all children from the original "Table" container
    const childrenToRemove = [...frame.children]
    childrenToRemove.forEach(child => {
      child.remove()
    })
    
    if (isRowBased) {
      // Switching to Column-based (was Row-based)
      frame.layoutMode = 'HORIZONTAL'
      
      // Iterate through the transposed matrix (by columns)
      for (let colIndex = 0; colIndex < matrix[0].length; colIndex++) {
                // Create a new FrameNode for the "Column"
        const newColumn = figma.createFrame()
        newColumn.name = `Column ${colIndex + 1}`
        newColumn.layoutMode = 'VERTICAL'
        newColumn.fills = [] // Remove default white fill
        
        // Set column width based on the first cell's width
        const firstCell = matrix[0][colIndex]
        if (firstCell) {
          newColumn.resize(firstCell.width, newColumn.height)
        }
        
        // Iterate through the rows of the matrix and append cells to the new column
        for (let rowIndex = 0; rowIndex < matrix.length; rowIndex++) {
          const cell = matrix[rowIndex][colIndex]
          if (cell) {
            newColumn.appendChild(cell)
            // Make each cell fill the container width
            if ((cell as any).layoutAlign === 'INHERIT' || (cell as any).layoutAlign === 'HUG') {
              (cell as any).layoutAlign = 'STRETCH'
            }
          }
        }
        
        // Append the new "Column" to the main "Table" container
        frame.appendChild(newColumn)
      }
    } else if (isColumnBased) {
      // Switching to Row-based (was Column-based)
      frame.layoutMode = 'VERTICAL'
      
      // Iterate through the transposed matrix (by rows)
      for (let rowIndex = 0; rowIndex < matrix.length; rowIndex++) {
        // Create a new FrameNode for the "Row"
        const newRow = figma.createFrame()
        newRow.name = `Row ${rowIndex + 1}`
        newRow.layoutMode = 'HORIZONTAL'
        newRow.fills = [] // Remove default white fill
        
        // Set row height based on the first cell's height
        const firstCell = matrix[rowIndex][0]
        if (firstCell) {
          newRow.resize(newRow.width, firstCell.height)
        }
        
        // Iterate through the columns of the matrix and append cells to the new row
        for (let colIndex = 0; colIndex < matrix[rowIndex].length; colIndex++) {
          const cell = matrix[rowIndex][colIndex]
          if (cell) {
            newRow.appendChild(cell)
            // Make each cell fill the container height
            if ((cell as any).layoutAlign === 'INHERIT' || (cell as any).layoutAlign === 'HUG') {
              (cell as any).layoutAlign = 'STRETCH'
            }
          }
        }
        
        // Append the new "Row" to the main "Table" container
        frame.appendChild(newRow)
      }
    }
    
    // Set the main table frame to hug its contents
    frame.layoutSizingHorizontal = 'HUG'
    frame.layoutSizingVertical = 'HUG'
    
    console.log('Table reconstruction completed successfully!')
  })
  
  once<CloseHandler>('CLOSE', function () {
    figma.closePlugin()
  })
  
  showUI({
    height: 124,
    width: 240
  })
}
