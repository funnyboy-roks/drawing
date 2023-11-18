# Drawing

This is a (mostly testing) site in which you can draw using your mouse.

There is minimal configuration for what pen you use and controlling some
of the strokes.

## Controls

When in "draw" mode, one can draw by using their left mouse button.  One
can erase points by holding right mouse button and erase strokes by
holding down both right and left mouse buttons.

When in "select" mode, one can move a stroke by clicking and dragging on
it.  Once can also change the weight and colour of a stroke by selecting
it and moving the sliders with the stroke.

## How it works

When you start drawing, it creates a `polyline` svg element on the
screen, adding points to the line as you move your mouse cursor.  Each
movement of the mouse is broken up into 5 pixel long sections to help
with erasing later.

The point eraser takes away all points near the eraser by splitting the
`polyline` into two new `polyline` elements.

The stroke eraser simple removes the element if the eraser is near any
of the points.
