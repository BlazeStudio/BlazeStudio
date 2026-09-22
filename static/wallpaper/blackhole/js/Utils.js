////////////////////////////////////////////////////////// Utility /////////////////////////////////////////////////////////////////

function abs(x) {
    if (x < 0)
      return -x;
    else
      return x;
  }
  
  function min(x, y) {
    return x < y ? x : y;
  }
  
  function max(x, y) {
    return x > y ? x : y;
  }
  
  function convertToHex(r, g, b) {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  
  function wallpaperEngineColorConversion(value){
    levels = value.split(' ');
    var r = int(parseFloat(levels[0]) * 255);
    var g = int(parseFloat(levels[1]) * 255);
    var b = int(parseFloat(levels[2]) * 255);
    return convertToHex(r, g, b);
  }