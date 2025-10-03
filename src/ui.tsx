import {
  Button,
  Container,
  render,
  VerticalSpace
} from '@create-figma-plugin/ui'
import { emit } from '@create-figma-plugin/utilities'
import { h } from 'preact'
import { useCallback } from 'preact/hooks'

import { CloseHandler, SwitchAxisHandler } from './types'

function Plugin() {
  const handleSwitchAxisButtonClick = useCallback(function () {
    emit<SwitchAxisHandler>('SWITCH_AXIS')
  }, [])
  
  const handleCloseButtonClick = useCallback(function () {
    emit<CloseHandler>('CLOSE')
  }, [])
  return (
    <Container space="medium">
      <VerticalSpace space="large" />
      <Button fullWidth onClick={handleSwitchAxisButtonClick}>
        Switch Axis
      </Button>
      <VerticalSpace space="small" />
      <Button fullWidth onClick={handleCloseButtonClick} secondary>
        Close
      </Button>
      <VerticalSpace space="small" />
    </Container>
  )
}

export default render(Plugin)
