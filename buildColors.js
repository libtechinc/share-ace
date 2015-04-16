// Usage: node buildColors.js > share-ace.css

var colormap = require('colormap');
var tinycolor = require('tinycolor2');

var cg = colormap({colormap: 'hsv', nshades: 16, format: 'hex'}); //if shades is a low number sometime we get bad colors

var nn = 0;
cg.forEach(function(o,n) {
  
  if(n % 2 === 1)
    return;
  
  var scolor = tinycolor(o).lighten(30).toString();
  var ccolor = tinycolor(o).lighten(10).toString();
  
  
  var foo = {
    'position':'absolute',
    'background':scolor,
    'z-index':5
  }
  
  var bar = {
    'position':'absolute',
    'background':ccolor,
    'z-index':6,
    'width':'2px!important'
  } 
  
  var barafter = {
    'position': 'absolute',
    'background': ccolor,
    'z-index': 6,
    'top': '-4px',
    'content': "' '",
    'left': '-3px',
    'font-family': 'Arial',
    'padding': '1px 2px',
    'width': '4px',
    'height': '4px',
  }  

  console.log('.ace-select-'+nn, JSON.stringify(foo).replace(/['"]+/g,'').replace(/[,]+/g,';'));
  console.log('.ace-cursor-'+nn, JSON.stringify(bar).replace(/['"]+/g,'').replace(/[,]+/g,';'));  
  console.log('.ace-cursor-'+nn+'::after', JSON.stringify(barafter).replace(/["]+/g,'').replace(/[,]+/g,';'));  
  nn++;
})
