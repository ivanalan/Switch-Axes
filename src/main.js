import { once, showUI } from '@create-figma-plugin/utilities';
export default function () {
    once('CREATE_RECTANGLES', function (count) {
        var nodes = [];
        for (var i = 0; i < count; i++) {
            var rect = figma.createRectangle();
            rect.x = i * 150;
            rect.fills = [
                {
                    color: { b: 0, g: 0.5, r: 1 },
                    type: 'SOLID'
                }
            ];
            figma.currentPage.appendChild(rect);
            nodes.push(rect);
        }
        figma.currentPage.selection = nodes;
        figma.viewport.scrollAndZoomIntoView(nodes);
        figma.closePlugin();
    });
    once('CLOSE', function () {
        figma.closePlugin();
    });
    showUI({
        height: 124,
        width: 240
    });
}
