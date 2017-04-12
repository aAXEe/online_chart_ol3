/**
* @license AGPL-3.0
* @author aAXEe (https://github.com/aAXEe)
*/
'use strict'
var ol = require('openlayers')

module.exports = function (svg, maxWidth, maxHeight, rotation) {
  const img = document.createElement('IMG')
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  const imgSize = [img.naturalWidth, img.naturalHeight]

  const scaleWidth = maxWidth / img.naturalWidth
  const scaleHeight = maxHeight / img.naturalHeight
  const scale = Math.min(scaleWidth, scaleHeight)

  const iconStyle = new ol.style.Icon({
    anchor: [0.5, 0.5],
    anchorXUnits: 'fraction',
    anchorYUnits: 'fraction',
    opacity: 0.75,
    img: img,
    imgSize: imgSize,
    scale: scale,
    rotation: rotation || 0
  })
  return iconStyle
}
