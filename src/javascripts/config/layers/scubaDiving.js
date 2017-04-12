/**
* @license AGPL-3.0
* @author aAXEe (https://github.com/aAXEe)
*/
'use strict'

import React from 'react'
import ol from 'openlayers'
import ChartLayer from '../chartlayer'
import { ClickOnMarkersMessage } from 'utils'
import {TabSidebarDetails} from 'features/tabs'
import controlIds from '../../controls/ol3/controls'
import orderIds from '../layerOrderNumbers'
import mapMarker from 'components/mapMarker'
import ScubaDivingSvg from './sport-scuba_diving.svg'
import DiveCentreSvg from './amenity-dive_centre.svg'

import { featureClicked, layerTileLoadStateChange } from '../../store/actions'
import { setSidebarOpen, setSidebarActiveTab } from '../../controls/sidebar/store'

import { defineMessages } from 'react-intl'
var SimpleImageSvgStyle = require('ol-style-simpleImageSvgStyle')
var OverpassApi = require('ol-source-overpassApi')

export const messages = defineMessages({
  layerName: {
    id: 'layer-name-scuba_diving',
    defaultMessage: 'POIs for scuba diving'
  }
})

const FEATURE_CLICKED_PROPERTY_NAME = '_clicked'

module.exports = function (context, options) {
  var defaults = {
    nameKey: 'layer-name-scuba_diving',
    iconSize: 32
  }
  Object.assign(defaults, options)

  var styles = {
    'sport': {
      'scuba_diving': new ol.style.Style({
        image: new SimpleImageSvgStyle(ScubaDivingSvg, defaults.iconSize, defaults.iconSize)
      })
    },
    'amenity': {
      'dive_centre': new ol.style.Style({
        image: new SimpleImageSvgStyle(DiveCentreSvg, defaults.iconSize, defaults.iconSize)
      })
    }
  }
  let tagBasedStyle = (feature) => {
    for (var key in styles) {
      var value = feature.get(key)
      if (value !== undefined) {
        for (var regexp in styles[key]) {
          if (new RegExp(regexp).test(value)) {
            return styles[key][regexp]
          }
        }
      }
    }
  }

  var styleFunction = function (feature, resolution) {
    let clicked = feature.get(FEATURE_CLICKED_PROPERTY_NAME)

    let baseStyle = tagBasedStyle(feature)

    if (clicked) {
      return [baseStyle, mapMarker]
    }

    return baseStyle
  }

  let source = new OverpassApi('(node[sport=scuba_diving](bbox);node[amenity=dive_centre](bbox););out body qt;')
  source.on(['tileloadstart', 'tileloadend', 'tileloaderror'], function (ev) {
    context.dispatch(layerTileLoadStateChange(options.id, ev))
  })

  let layer = new ol.layer.Vector({
    source: source,
    style: styleFunction,
    zIndex: orderIds.user_overlay
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

  var objects = {
    layer: layer,

    isInteractive: true,

    additionalSetup: (
      <div>
        <ClickOnMarkersMessage />
      </div>
    ),
    additionalTab: TabSidebarDetails,
    additionalControls: [controlIds.attribution]
  }

  return new ChartLayer(context, Object.assign(defaults, objects))
}
