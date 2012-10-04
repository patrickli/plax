/* Plax version 1.3.1 */

/*
  Copyright (c) 2011 Cameron McEfee

  Permission is hereby granted, free of charge, to any person obtaining
  a copy of this software and associated documentation files (the
  "Software"), to deal in the Software without restriction, including
  without limitation the rights to use, copy, modify, merge, publish,
  distribute, sublicense, and/or sell copies of the Software, and to
  permit persons to whom the Software is furnished to do so, subject to
  the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
  LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
  OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
  WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

(function ($) {

  var middlePoint        = 0,
      mouseLastX         = 0,
      catchingUp         = false,
      catchUpDistance    = 50,
      catchUpStep        = 20,
      catchUpInterval    = 2,
      catchUpTimeout     = undefined,
      layers             = [],
      plaxActivityTarget = $(window)

  // Public Methods
  $.fn.plaxify = function (params){

    return this.each(function () {
      var layerExistsAt = -1
      var layer         = {
        "xRange": $(this).data('xrange') || 0,
        "yRange": $(this).data('yrange') || 0,
        "invert": $(this).data('invert') || false,
        "css3d": (Modernizr && Modernizr.csstransforms3d) ? true : false,
        "background": $(this).data('background') || false
      }

      for (var i=0;i<layers.length;i++){
        if (this === layers[i].obj.get(0)){
          layerExistsAt = i
        }
      }

      for (var param in params) {
        if (layer[param] == 0) {
          layer[param] = params[param]
        }
      }

      layer.inversionFactor = (layer.invert ? -1 : 1) // inversion factor for calculations

      // Add an object to the list of things to parallax
      layer.obj    = $(this)
      if(layer.background) {
        // animate using the element's background
        pos = (layer.obj.css('background-position') || "0px 0px").split(/ /)
        if(pos.length != 2) {
          return
        }
        x = pos[0].match(/^((-?\d+)\s*px|0+\s*%|left)$/)
        y = pos[1].match(/^((-?\d+)\s*px|0+\s*%|top)$/)
        if(!x || !y) {
          // no can-doesville, babydoll, we need pixels or top/left as initial values (it mightbe possible to construct a temporary image from the background-image property and get the dimensions and run some numbers, but that'll almost definitely be slow)
          return
        }
        layer.startX = x[2] || 0
        layer.startY = y[2] || 0
      } else {

        // Figure out where the element is positioned, then reposition it from the top/left
        var position = layer.obj.position()
        var css = {
          'right' :'',
          'bottom':''
        }
        if (!layer.css3d) {
          css.top = position.top;
          css.left = position.left;
        }
        layer.obj.css(css)
        layer.startX = this.offsetLeft
        layer.startY = this.offsetTop
      }

      layer.startX -= layer.inversionFactor * Math.floor(layer.xRange/2)
      layer.startY -= layer.inversionFactor * Math.floor(layer.yRange/2)
      if(layerExistsAt >= 0){
        layers.splice(layerExistsAt,1,layer)
      } else {
        layers.push(layer)
      }
      
    })
  }

  // Move the elements in the `layers` array within their ranges, 
  // based on mouse input 
  //
  // Parameters
  //
  //  e - mousemove event
  //
  // returns nothing

  function plaxifier(e) {
    var offset     = plaxActivityTarget.offset(),
        leftOffset = (offset != null) ? offset.left : 0,
        topOffset  = (offset != null) ? offset.top : 0,
        x          = e.pageX-leftOffset,
        y          = e.pageY-topOffset
    if (
      x < 0 || x > plaxActivityTarget.width() ||
      y < 0 || y > plaxActivityTarget.height()
    ) return

    if (Math.abs(x - mouseLastX) > catchUpDistance) {
      clearTimeout(catchUpTimeout);
      _start(x, y);
    } else {
      if (!catchingUp) {
        _plaxifier(x, y);
      }
    }
  }

  function _start(x, y, speed) {
    speed = speed || 1;
    catchingUp = true;
    var realStep = catchUpStep * speed;
    catchUpTimeout = setTimeout(function() {
      var nextX = mouseLastX + (x >= mouseLastX ? 1 : -1) * realStep;
      if (Math.abs(nextX - x) > realStep) {
        _plaxifier(nextX, y);
        _start(x, y, speed);
      } else {
        clearTimeout(catchUpTimeout);
        catchingUp = false;
      }
    }, catchUpInterval);
  }

  function _plaxifier(x, y) {
    var hRatio = x/plaxActivityTarget.width(),
        vRatio = y/plaxActivityTarget.height(),
        layer, i, css

    for (i = layers.length; i--;) {
      layer = layers[i]
      newX = layer.startX + layer.inversionFactor*(layer.xRange*hRatio)
      newY = layer.startY + layer.inversionFactor*(layer.yRange*vRatio)
      if(layer.background) {
        layer.obj.css('background-position', newX+'px '+newY+'px')
      } else {
        if (layer.css3d) {
          css = {
            'transform': 'translate3d(' + newX + 'px, ' + newY + 'px, 0px)',
            'left': 0,
            'top': 0
          }
        } else {
          css = {
            'left': newX,
            'top': newY
          }
        }
        layer.obj
          .css(css)
      }
    }
    mouseLastX = x;
  }

  $.plax = {

    // Begin parallaxing
    //
    // Parameters
    //
    //  opts - options for plax
    //    activityTarget - optional; plax will only work within the bounds of this element, if supplied.
    //
    //  Examples
    //
    //    $.plax.enable({ "activityTarget": $('#myPlaxDiv')})
    //    # plax only happens when the mouse is over #myPlaxDiv
    //
    // returns nothing
    enable: function(opts){
      if (opts) {
        plaxActivityTarget = opts.activityTarget || $(window)
        mouseLastX = middlePoint = opts.middlePoint || middlePoint
      }
      $(document).bind('mousemove.plax', plaxifier)
    },

    // Stop parallaxing
    //
    //  Examples
    //
    //    $.plax.disable()
    //    # plax no longer runs
    //
    // returns nothing
    disable: function(){
      $(document).unbind('mousemove.plax')
    },

    reset: function(speed) {
      _start(middlePoint, 0, speed);
    }
  }

  if (typeof ender !== 'undefined') {
    $.ender($.fn, true)
  }

})(function () {
  return typeof jQuery !== 'undefined' ? jQuery : ender
}())