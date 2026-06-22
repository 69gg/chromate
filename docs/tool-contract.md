# Tool Contract

All coordinates are CSS viewport pixels relative to the top-left corner of the selected page viewport. They are not physical device pixels and are not screen coordinates.

## Tools

### `list_tabs`

Input:

```json
{ "includeInternal": false }
```

Returns `tabs` with `tabId`, `title`, `url`, `type`, `attached`, and `selected`.

### `select_tab`

Input:

```json
{ "tabId": "CDP_TARGET_ID", "activate": true }
```

Sets the current tab for later operations. `activate` calls `Target.activateTarget`.

### `screenshot`

Input:

```json
{
  "overlay": "grid",
  "crosshair": { "x": 400, "y": 300 }
}
```

`overlay` can be `grid` or `none`. The result includes an `image/png` plus structured metadata:

```json
{
  "width": 1280,
  "height": 720,
  "coordinateSystem": "css_viewport_pixels",
  "viewport": {
    "width": 1280,
    "height": 720,
    "deviceScaleFactor": 1,
    "scrollX": 0,
    "scrollY": 0,
    "url": "https://example.com/",
    "title": "Example"
  }
}
```

### `click`

Input:

```json
{
  "x": 400,
  "y": 300,
  "button": "left",
  "clickCount": 1,
  "wait": "auto",
  "returnScreenshot": true
}
```

`button` can be `left`, `right`, or `middle`. `wait` can be `auto` or `none`. With `returnScreenshot: true`, the result includes an after screenshot with a grid and click crosshair.

### `scroll`

Input:

```json
{ "deltaX": 0, "deltaY": 600, "x": 640, "y": 360 }
```

If `x` or `y` is omitted, the viewport center is used.

### `type_text`

Input:

```json
{ "text": "hello" }
```

Inserts text into the focused element.

### `press_key`

Input:

```json
{ "key": "Enter" }
```

Dispatches a key down/up pair.

### `wait`

Input:

```json
{ "text": "Loaded", "timeoutMs": 30000 }
```

If `text` is omitted, waits for the default settle delay and checks page readiness.

### `page_info`

Input:

```json
{}
```

Returns selected tab and viewport metadata.

## Error Behavior

The server fails fast for missing tabs, closed CDP connections, invalid coordinates, and timeouts. Coordinate errors include the current viewport size to help the caller correct the next action.
