import { EventHandler } from '@create-figma-plugin/utilities'

export interface SwitchAxisHandler extends EventHandler {
  name: 'SWITCH_AXIS'
  handler: () => void
}

export interface CloseHandler extends EventHandler {
  name: 'CLOSE'
  handler: () => void
}
