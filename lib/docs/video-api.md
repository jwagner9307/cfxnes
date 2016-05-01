# Video API

**Note: This documentation is for the upcoming version 0.5.0**

- [Options](#user-content-options)
- [Methods](#user-content-methods)
- [Enumerations](#user-content-enumerations)

## Options

| Name | Type | Default | Description |
|------|------|----------|-------------|
| videoOutput | `HTMLCanvasElement` | `undefined` | Canvas element used for rendering. This option is not persisted when calling [`.saveOptions()`](data-api.md#user-content-saveoptions). |
| videoRenderer | [`VideoRenderer`](#user-content-videorenderer) | `'webgl'` | Rendering back-end. |
| videoPalette | [`VideoPalette`](#user-content-videopalette) | `'fceux'` | Palette used for generating RGB color values. |
| videoScale | `number` | `1.0` | Canvas resolution multiplier. The base resolution is 256x240. It must larger than `0`. Non-integer value might cause visual artifacts due to upscaling. |
| videoSmooting | `boolean` | `false` | Enables smoothing effect for upscaled canvas resolution. |
| videoDebugging | `boolean` | `false` | Enables additional video output (content of pattern tables and image/sprite palettes). Setting it `true` will double width of the canvas. |
| fullscreenType | [`FullscreenType`](#user-content-fullscreentype) | `'maximized'` | Type of full screen mode. |

*Example:*

``` javascript
new CFxNES({
  videoOutput: document.getElementById('canvas-id'),
  videoRenderer: 'webgl',
  videoPalette: 'fceux',
  videoScale: 1.0,
  videoSmooting: false,
  videoDebugging: false,
  fullscreenType: 'maximized'
});
```


## Methods

#### .setVideoOutput(canvas)

Sets the `canvas` element used for rendering.

- **canvas**: `HTMLCanvasElement` - the canvas element

#### .getVideoOutput()

Returns the `canvas` element currently used for rendering.

- **returns**: `HTMLCanvasElement` - the canvas element

#### .setVideoRenderer(renderer)

Sets the rendering back-end.

- **renderer**: [`VideoRenderer`](#user-content-videorenderer) - the renderer

#### .getVideoRenderer()

Returns the current rendering back-end.

- **returns**: [`VideoRenderer`](#user-content-videorenderer) - the renderer

#### .isVideoRendererSupported(renderer)

Returns whether a renderer is supported. It will always return `true` for the `'canvas'` renderer.

- **returns**: `boolean` - `true` if the specified render is supported; `false` otherwise

#### .setVideoScale(scale)

Sets the canvas resolution multiplier.

- **scale**: `number` - the multiplier

#### .getVideoScale()

Returns the current canvas resolution multiplier.

- **returns**: `number` - the multiplier

#### .getMaxVideoScale()

Returns the maximal possible value of the `videoScale` option that does not cause canvas to overgrow the screen resolution.

- **returns**: `number` - the multiplier

#### .setVideoSmoothing(smoothing)

Sets whether smoothing is enabled.

- **smoothing**: `boolean` - `true` to enable smoothing; `false` to disable

#### .isVideoSmoothing()

Returns whether smoothing is enabled.

- **returns**: `boolean` - `true` if smoothing is enabled; `false` otherwise

#### .setVideoDebugging(debugging)

Sets whether the debugging output is enabled.

- **debugging**: `boolean` - `true` to enable debugging output; `false` to disable

#### .isVideoDebugging()

Returns whether the debugging output is enabled.

- **returns**: `boolean` - `true` if debugging output is enabled; `false` otherwise

#### .enterFullscreen()

Enables full screen mode.

#### .setFullscreenType(type)

Sets the type of full screen mode.

- **type**: [`FullscreenType`](#user-content-fullscreentype) - the type of full screen mode

#### .getFullscreenType()

Returns the current type of full screen mode.

- **returns**: [`FullscreenType`](#user-content-fullscreentype) - the type of full screen mode

## Enumerations

#### VideoRenderer

- `'canvas'` - Rendering using the standard Canvas API. It is used as fallback when WebGL is not available.
- `'webgl'` - Rendering using WebGL. It reduces CPU usage and possible screen tearing artifacts. WebGL is typically faster than the `'canvas'` renderer, but this highly depends on browser, OS, graphic card driver, etc.

#### VideoPalette

See [FCEUX documentation](http://www.fceux.com/web/help/fceux.html?PaletteOptions.html) for description of each palette.

- `'asq-real-a'` - ASQ (reality A)
- `'asq-real-b'` - ASQ (reality B)
- `'bmf-fin-r2'` - BMF (final revision 2)
- `'bmf-fin-r3'` - BMF (final revision 3)
- `'fceu-13'` - FCEU .13
- `'fceu-15'` - FCEU .15
- `'fceux'` - FCEUX
- `'nestopia-rgb'` - Nestopia (RGB)
- `'nestopia-yuv'` - Nestopia (YUV)

#### FullscreenType

- `'maximized'` - Maximizes the output resolution while keeping its original aspect ratio.
- `'normalized'` - Same as the `'maximazed'`, but the output resolution is integer multiple of the base resolution 256x240.
- `'stretched'` - Output is stretched to fill the whole screen (both horizontally and vertically). The original aspect ratio is not preserved.