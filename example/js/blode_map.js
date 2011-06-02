// Blode message graphing
var BlodeMap = Class.create({
  initialize: function(container_id) {
    this._container = $(container_id);
    this._socket = new BlodeSocket().listen('10.10.10.2', '8008');
    this._geo_url = "http://ben-dev/geoip/lookup.php?jsonp=window.blode_map.log_visitor&ip=";
    this._map_image = "images/world_map.jpg";
    this._background = this.create_canvas(this._container, 0);
    this._foreground = this.create_canvas(this._container, 1);
    this._heatmap_layer = null;
    this._heatmap = null;
    this.party_mode = false;
    this.heatmap_enabled = false;

    this._point_size = 2;
    this._point_color = "rgba(255, 0, 0, 0.5)";
    this._point_buffer = {};
    this._point_buffer_size = 1000;

    // prime the point buffer
    this.initialize_point_buffer();

    // setup heatmap
    this.initialize_heatmap();

    this.render_background();

    this.listen();
  },

  initialize_point_buffer: function() {
    this._point_buffer = { max: 1, data: [] };

    for(var i = 0; i < this._point_buffer_size; i++)
      this._point_buffer.data[i] = {x: 0, y: 0, count: 0};
  },

  initialize_heatmap: function() {
    this._heatmap_layer = new Element("div");
    this._heatmap_layer.style.posistion = "absolute";
    this._heatmap_layer.clonePosition(this._background);
    this._heatmap_layer.width = this._container.getWidth();
    this._heatmap_layer.height = this._container.getWidth() / 2;

    this._container.insert(this._heatmap_layer);

    this._heatmap = h337.create({"element": this._heatmap_layer, "radius": 8, "visible":true, opacity: 25});
    this._heatmap.store.setDataSet(this._point_buffer);
  },

  listen: function() {
    this._socket.observe('blode:message', function(data) {
      var message = data.memo.message();
      if(message.include('app.run')) {
        var ip = message.evalJSON().remote_addr;
        new Ajax.JSONRequest(this._geo_url + ip, {
        });
      }
    }.bind(this));
  },

  create_canvas: function(container, layer) {
    var canvas = new Element('canvas'),
        layer  = layer || 0;

    // each canvas (layer) is the exact same size as its parent container
    canvas.style.position = "absolute";  
    canvas.clonePosition(container);
    canvas.width = container.getWidth();
    canvas.height = container.getWidth() / 2;
    canvas.style.zIndex = layer;

    container.insert(canvas);

    return canvas;
  },

  render_background: function() {
    // The background layer consists of each bar's background color
    var context = this._background.getContext('2d');

    // clear layer
    context.clearRect(0, 0, this._background.width, this._background.height);

    var context = this._background.getContext('2d');
    var img = new Image();
    img.src = this._map_image;
    img.onload = function() {
      context.drawImage(img, 0, 0, img.width, img.height, 0, 0, context.canvas.width, context.canvas.height);
    }.bind(this);
  },

  render_foreground: function() {
    var context = this._foreground.getContext('2d');

    // clear layer
    context.clearRect(0, 0, this._foreground.width, this._foreground.height);

    if(this.heatmap_enabled) {
      this.render_heatmap();
      return;
    }

    for(i = 0, j = this._point_buffer_size; i < j; i++) {
      if(this._point_buffer.data[i].x != 0 && this._point_buffer.data[i].y != 0) {
        // set layer color
        if(this.party_mode)
          context.fillStyle = this.random_color();
        else
          context.fillStyle = this._point_color;

        var point_size = (i == 0) ? this._point_size * 2 : this._point_size;
        context.beginPath();
        context.arc(this._point_buffer.data[i].x - (point_size / 2),
                    this._point_buffer.data[i].y - (point_size / 2),
                    point_size,
                    0, Math.PI * 2, true);
        context.closePath();
        context.fill();
      }
    }
  },

  render_heatmap: function() {
    var max = 0;
    this._point_buffer.data.each(function(point) {
      if(point.count > max)
        max = point.count;
    });

    this._point_buffer.max = max;
    this._heatmap.store.setDataSet(this._point_buffer);
  },

  log_visitor: function(geo_data) {
    var context = this._foreground.getContext('2d');
    var minX = -180,
        minY = -90,
        maxX = 180,
        maxY = 90;

    var lon = geo_data.longitude,
        lat = geo_data.latitude;

    if(lon == 0 || lat == 0)
      return;

    var x = (this._foreground.width * (lon - minX)) / (maxX - minX),
        y = this._foreground.height - ((this._foreground.height * (lat - minY)) / (maxY - minY));

    var point = {x: x, y: y, count: 1};

    if(this.point_exists(point)) {
      this._point_buffer.data.each(function(item) {
        if(item.x == point.x && item.y == point.y)
          item.count++;
      });
    } else {
      // insert the new piont into the buffer
      this._point_buffer.data.unshift(point);

      // remove the last item from the buffer
      this._point_buffer.data.data = this._point_buffer.data.slice(0, -1);  
    }

    this.render_foreground();
  },

  point_exists: function(point) {
    var exists = false;

    this._point_buffer.data.each(function(item) {
      if(item.x == point.x && item.y == point.y) {
        exists = true;
        return(true);
      }
    });

    return(exists);
  },

  random_color: function(index) {
    return("rgba(" + Math.floor(Math.random() * 255) + ", " + Math.floor(Math.random() * 255) + ", " + Math.floor(Math.random() * 255) + ", 0.5)");
  }
});
