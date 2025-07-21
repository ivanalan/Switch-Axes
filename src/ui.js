import { Button, Columns, Container, Muted, render, Text, TextboxNumeric, VerticalSpace } from '@create-figma-plugin/ui';
import { emit } from '@create-figma-plugin/utilities';
import { h } from 'preact';
import { useCallback, useState } from 'preact/hooks';
function Plugin() {
    var _a = useState(5), count = _a[0], setCount = _a[1];
    var _b = useState('5'), countString = _b[0], setCountString = _b[1];
    var handleCreateRectanglesButtonClick = useCallback(function () {
        if (count !== null) {
            emit('CREATE_RECTANGLES', count);
        }
    }, [count]);
    var handleCloseButtonClick = useCallback(function () {
        emit('CLOSE');
    }, []);
    return (h(Container, { space: "medium" },
        h(VerticalSpace, { space: "large" }),
        h(Text, null,
            h(Muted, null, "Count Alan")),
        h(VerticalSpace, { space: "small" }),
        h(TextboxNumeric, { onNumericValueInput: setCount, onValueInput: setCountString, value: countString }),
        h(VerticalSpace, { space: "extraLarge" }),
        h(Columns, { space: "extraSmall" },
            h(Button, { fullWidth: true, onClick: handleCreateRectanglesButtonClick }, "Create"),
            h(Button, { fullWidth: true, onClick: handleCloseButtonClick, secondary: true }, "Close")),
        h(VerticalSpace, { space: "small" })));
}
export default render(Plugin);
