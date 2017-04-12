/**
* @license AGPL-3.0
* @author aAXEe (https://github.com/aAXEe)
*/
'use strict'

import ol from 'openlayers'
import ChartLayer from '../chartlayer'
import { layerTileLoadStateChange } from '../../store/actions'
import controlIds from '../../controls/ol3/controls'
import orderIds from '../layerOrderNumbers'

module.exports = function (context, options) {
  // return the url to get the tile at [z, x, -y]
  function tileUrlFunction (tileCoord) {
    return ('https://tiles.marinetraffic.com/ais_helpers/shiptilesingle.aspx?output=png&sat=1&grouping=shiptype&tile_size=512&legends=1&zoom={z}&X={x}&Y={y}')
              .replace('{z}', String(tileCoord[0] + 1))
              .replace('{x}', String(tileCoord[1]))
              .replace('{y}', String(-tileCoord[2] - 1))
  }
  var ATTRIBUTION = 'Ship data by <a href="https://marinetraffic.com/">MarineTraffic</a>'
  let source = new ol.source.XYZ({
    attributions: [new ol.Attribution({html: ATTRIBUTION})],
    tileUrlFunction: tileUrlFunction,
    crossOrigin: 'Anonymous',
    tileSize: [512, 512]
  })

  source.on(['tileloadstart', 'tileloadend', 'tileloaderror'], function (ev) {
    context.dispatch(layerTileLoadStateChange(options.id, ev))
  })

  var defaults = {
    nameKey: 'layer-name-marinetraffic',
    layer: new ol.layer.Tile({
      source: source,
      opacity: 0.7,
      zIndex: orderIds.user_overlay
    }),
    additionalControls: [controlIds.scaleline_nautical, controlIds.attribution]
  }
  return new ChartLayer(context, Object.assign(defaults, options))
}
