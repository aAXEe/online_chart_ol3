/**
* @license AGPL-3.0
* @author aAXEe (https://github.com/aAXEe)
*/
'use strict'

import React from 'react'
import { ClickOnMarkersMessage } from 'utils'
import {TabSidebarDetails} from 'features/tabs'
import ol from 'openlayers'
import ChartLayer from '../chartlayer'
import orderIds from '../layerOrderNumbers'

import SimpleImageSvgStyle from 'ol-style-simpleImageSvgStyle'
import VesselSvg from './marinetraffic-symbol-vessel.svg'
import VesselMarkedSvg from './marinetraffic-symbol-vessel-marked.svg'
import VesselAnchorSvg from './marinetraffic-symbol-vesselAnchor.svg'
import VesselAnchorMarkedSvg from './marinetraffic-symbol-vesselAnchor-marked.svg'

import { featureClicked, layerTileLoadStateChange } from '../../store/actions'
import { setSidebarOpen, setSidebarActiveTab } from '../../controls/sidebar/store'
import warning from 'fbjs/lib/warning'

import { defineMessages } from 'react-intl'
var $ = require('jquery')

export const messages = defineMessages({
  layerName: {
    id: 'layer-name-marinetraffic',
    defaultMessage: 'Marine traffic'
  }
})

const FEATURE_CLICKED_PROPERTY_NAME = '_clicked'
const FEATURE_HOVERED_PROPERTY_NAME = '_hovered'

module.exports = function (context, options) {
  var defaults = {
    nameKey: 'layer-name-marinetraffic',
    iconSize: 32
  }
  Object.assign(defaults, options)

    // xyz grid for tile access
  const tileGrid = ol.tilegrid.createXYZ({maxZoom: 9, tileSize: [512, 512]})
  const labelGrid = ol.tilegrid.createXYZ()

  const vesselImage = new SimpleImageSvgStyle(VesselSvg, defaults.iconSize, defaults.iconSize)
  const vesselImageMarked = new SimpleImageSvgStyle(VesselMarkedSvg, defaults.iconSize, defaults.iconSize)
  const vesselAnchorImage = new SimpleImageSvgStyle(VesselAnchorSvg, defaults.iconSize / 2, defaults.iconSize / 2)
  const vesselAnchorImageMarked = new SimpleImageSvgStyle(VesselAnchorMarkedSvg, defaults.iconSize / 2, defaults.iconSize / 2)
  var styleFunction = function (feature, resolution) {
    const z = labelGrid.getZForResolution(resolution)
    const clicked = feature.get(FEATURE_CLICKED_PROPERTY_NAME)
    const hovered = feature.get(FEATURE_HOVERED_PROPERTY_NAME)
    const speed = Number(feature.get('SPEED')) / 10
    const rotation = Number(feature.get('COURSE')) * Math.PI / 180
    const length = Number(feature.get('LENGTH'))

    let localImage = speed > 1 ? (clicked ? vesselImageMarked : vesselImage) : (clicked ? vesselAnchorImageMarked : vesselAnchorImage)
    let scale = localImage.getScale('originalScale')
    if (z < 10) scale *= z / 10

    localImage = localImage.clone()
    localImage.setScale(scale)
    localImage.setRotation(rotation)

    const style = new ol.style.Style({
      image: localImage
    })

    let showLabel = hovered || clicked

    if (z >= 12) showLabel = true
    if (z >= 10 && length >= 50) showLabel = true
    if (z >= 8 && length >= 100)showLabel = true
    if (z >= 7 && length >= 200) showLabel = true

    if (showLabel) {
      const name = feature.get('SHIPNAME') || feature.get('MMSI')
      const nameElement = new ol.style.Text({
        font: hovered ? 'bold 12px sans-serif' : '10px sans-serif',
        offsetY: defaults.iconSize * scale / 2,
        text: name,
        textAlign: 'center',
        textBaseline: 'top'
      })
      style.setText(nameElement)
    }
    return style
  }

  var ATTRIBUTION = 'Ship data by <a href="https://marinetraffic.com/">MarineTraffic</a>'

    // return the url to get the tile at [z, x, -y]
  function tileUrlFunction (tileCoord) {
    return ('http://www.marinetraffic.com/getData/get_data_json_3/z:{z}/X:{x}/Y:{y}/station:0')
                .replace('{z}', String(tileCoord[0] + 1))
                .replace('{x}', String(tileCoord[1]))
                .replace('{y}', String(-tileCoord[2]) - 1)
  }

    // return the url to be fetched to get the data inside the resoultion area
  function mapExtentToTile (extent, resoltuion) {
    let coords = []
    tileGrid.forEachTileCoord(extent, tileGrid.getZForResolution(resoltuion), (coord) => {
      coords.push(coord)
    })
    const coord = coords[0]
    return tileUrlFunction(coord)
  }

  let source = new ol.source.Vector({
    attributions: [new ol.Attribution({html: ATTRIBUTION})],
    loader: function (extent, resolution, projection) {
      var url = mapExtentToTile(extent, resolution)
      let corsUrl = 'https://whateverorigin.herokuapp.com/get?url=' + encodeURIComponent(url) + '&callback=?'

      $.ajax({
        url: corsUrl,
        dataType: 'json',
        success: function (data) {
          let features = []
          let results

          if (!data.contents) {
            // empty response received: no ships in this area
            this.dispatchEvent({type: 'tileloadend', target: this})
            return
          }

          try {
            results = JSON.parse(data.contents)
          } catch (e) {
            warning(0, 'Marine traffic API returned error: "' + data.contents + '"')
            this.dispatchEvent({
              type: 'tileloaderror',
              target: this,
              textStatus: data.contents,
              errorThrown: e
            })
            return
          }
          this.dispatchEvent({type: 'tileloadend', target: this})
          const resultList = results.data.rows
          resultList.forEach((res) => {
            let featureProps = res
            let labelCoords = ol.proj.fromLonLat([Number(res.LON), Number(res.LAT)])
            featureProps.geometry = new ol.geom.Point(labelCoords)

            let feature = new ol.Feature(featureProps)
                    // feature.setStyle(styleFunction)
            feature.setId(res.SHIP_ID)
            features.push(feature)
          })

          this.addFeatures(features)
        },
        error: function (jqXHR, textStatus, errorThrown) {
          this.dispatchEvent({
            type: 'tileloaderror',
            target: this,
            textStatus: textStatus,
            errorThrown: errorThrown
          })
        },
        context: this
      })

      this.dispatchEvent({type: 'tileloadstart', target: this})
    },
    strategy: ol.loadingstrategy.tile(tileGrid)
  })
  source.on(['tileloadstart', 'tileloadend', 'tileloaderror'], function (ev) {
    context.dispatch(layerTileLoadStateChange(options.id, ev))
  })

  let layer = new ol.layer.Vector({
    source: source,
    style: styleFunction,
    zIndex: orderIds.user_overlay,
    updateWhileAnimating: false,
    updateWhileInteracting: true
  })

  layer.on('selectFeature', function (e) {
    let feature = e.feature
    feature.set(FEATURE_CLICKED_PROPERTY_NAME, true)
    context.dispatch(featureClicked(feature.getProperties()))
    context.dispatch(setSidebarActiveTab(TabSidebarDetails.name))
    context.dispatch(setSidebarOpen(true))
  })
  layer.on('unselectFeature', function (e) {
    e.feature.set(FEATURE_CLICKED_PROPERTY_NAME, false)
  })

  layer.on('hoverFeature', function (e) {
    let feature = e.feature
    feature.set(FEATURE_HOVERED_PROPERTY_NAME, true)
  })
  layer.on('unhoverFeature', function (e) {
    e.feature.set(FEATURE_HOVERED_PROPERTY_NAME, false)
  })

  var objects = {
    layer: layer,
    isInteractive: true,
    additionalSetup: (
      <div>
        <ClickOnMarkersMessage />
      </div>
    ),
    additionalTab: TabSidebarDetails
  }

  return new ChartLayer(context, Object.assign(defaults, objects))
}
