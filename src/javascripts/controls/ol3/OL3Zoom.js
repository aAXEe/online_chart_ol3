/**
* @license AGPL-3.0
* @author mojoaxel (https://github.com/mojoaxel)
*/
'use strict'

import OL3Control from './OL3Control'
import ol from 'openlayers'

class OL3Zoom extends OL3Control {
  _createControl () {
    this._control = new ol.control.Zoom({
      target: this._element
    })
    return this._control
  }
}

export default OL3Zoom
