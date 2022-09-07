import chroma from 'chroma-js';
import { MAIN_COLOUR, MARKERS_MIN_ZOOM } from '../config.js';
import { Panel } from './panel.js';

class MapPanel extends Panel {
  layers = {};
  constructor(parent) {
    const id = 'report_map_map_container';
    super(id, parent);
    this.id = id + '_' + parent.container.dataset.mapSourceId;
    this.zoomControls = false;
    if ('mapZoomControls' in parent.container.dataset && parent.container.dataset.mapZoomControls.toLowerCase() === 'true') {
      this.zoomControls = true;
    }
    this.resetViewControl = false;
    if ('mapResetViewControl' in parent.container.dataset && parent.container.dataset.mapResetViewControl.toLowerCase() === 'true') {
      this.resetViewControl = true;
    }
    this.container.id = this.id;
    this.container.classList.add('hide-point-layer');
    this.resources = parent.container.dataset.mapGeometries.split(',');
    this.markers = null;
    this.colors = chroma.scale(['#ffffff', MAIN_COLOUR]).mode('lch').colors(7);
    this.colors.shift();
    this.init();
  }
  init() {
    this.leaflet = L.map(this.id, {zoomSnap: 0, minZoom: 5});
    if (!this.zoomControls) {
      document.querySelector('.leaflet-control-zoom').style.display = 'none';
    }
    if (this.resetViewControl) {
      this.add_reset_view_control();
    }
    this.legend = new Panel('reportmap_legend', this.parent);
    this.load();
  }
  add_reset_view_control() {
    document.querySelectorAll('.leaflet-control-zoom a').forEach(control => {
      control.dataset.tooltip = control.title;
      control.dataset.position = 'right';
      control.classList.add('tooltipped');
      control.title = '';
    });
    var html = `
        <a class="tooltipped leaflet-control-reset-view" href="#" role="button" aria-label="Reset view" data-tooltip="Reset view">
        <span class="material-icons">
        home
        </span>
        </a>
    `;
    var element = document.createElement('div');
    element.classList.add('leaflet-control-view');
    element.classList.add('leaflet-bar');
    element.classList.add('leaflet-control');
    element.innerHTML = html;
    document.querySelector('.leaflet-control-zoom').parentElement.appendChild(element);
    document.querySelector('.leaflet-control-reset-view').addEventListener('pointerup', event => {
      this.leaflet.fitBounds(this.initialBounds, {padding: this.initialPadding});
    });

  }
  load() {
    this.leaflet.setView([51.505, -0.09], 13);
    Object.keys(this.parent.resources).forEach(type => {
      const resource = this.parent.resources[type];
      const metric = this.parent.panels.get_selected_metric() || this.parent.defaultMetric;
      if (['regions', 'constituencies'].indexOf(type) !== -1) this.make_layer(type, metric);
    });
    this.visible = Object.keys(this.layers)[0];
    var layer = this.show_layer(this.visible);
    this.initialBounds = layer.getBounds();
    this.initialPadding = [30, 30];
    this.leaflet.fitBounds(this.initialBounds, {padding: this.initialPadding});
    this.load_markers();
  }
  make_marker_style(className) {
    var sample = document.createElement('div');
    sample.classList.add(className);
    sample.classList.add('leaflet-tooltip');
    document.querySelector('.leaflet-pane .leaflet-tooltip-pane').append(sample);
    var style = getComputedStyle(sample);
    var return_style = {
      backgroundColor: style.backgroundColor,
      color: style.color
    }
    sample.remove();
    return return_style;
  }
  load_markers() {
    if ('markers' in this.parent.resources || 'pins' in this.parent.resources) {
      if ('markers' in this.parent.resources) var geojson = this.parent.resources['markers'].geojson;
      if ('pins' in this.parent.resources) var geojson = this.parent.resources['pins'].geojson;
      if (this.markers) {
        this.leaflet.removeLayer(this.markers);
      }
      var marker_styles = [];
      marker_styles.push(this.make_marker_style('marker1-tooltip'));
      marker_styles.push(this.make_marker_style('marker2-tooltip'));
      marker_styles.push(this.make_marker_style('marker3-tooltip'));
      this.markers = L.geoJSON(geojson, {
        options: {pane: 'markers'},
        onEachFeature: (feature, layer) => {
          layer.bindTooltip(feature.properties.name, {
            className: 'marker' + feature.properties.type + '-tooltip',
            opacity: 1, direction: 'top', permanent: false
          });
        },
        pointToLayer: (feature, latlng) => {
          const geojsonMarkerOptions = {
            radius: feature.properties.radius,
            fillColor: marker_styles[feature.properties.type - 1].backgroundColor,
            color: marker_styles[feature.properties.type - 1].color,
            weight: 1,
            opacity: 1,
            fillOpacity: 1
          };
          var marker = L.circleMarker(latlng, geojsonMarkerOptions);
          marker.on('add', function(marker) {
            var markerElem = marker.target.getElement();
            markerElem.classList.add('point-layer');
          });
          return marker;
        }}).addTo(this.leaflet);
        this.leaflet.on('zoomend', (ev) => {
          if (ev.target.getZoom() <= MARKERS_MIN_ZOOM) {
            this.container.classList.add('hide-point-layer');
          } else {
            this.container.classList.remove('hide-point-layer');
          }
        });
    }
  }
  get_color(ranges, metric, value) {
    if (typeof this.visible === 'undefined') return;
    const max = this.parent.metrics[metric].getMax(this.visible);
    if (ranges) {
      ranges = ranges.map(range => parseInt(range));
      var breakpoint = ranges.find(range => {
        return value <= parseInt(range);
      });
      if (typeof breakpoint === 'undefined') breakpoint = ranges.length - 1;
      var index = ranges.indexOf(breakpoint) - 1;
    } else {
      var index = parseInt(value / (max / this.colors.length));
    }
    var color = this.colors[this.colors.length - 1];
    if (parseInt(value) < max) {
      if (index >= this.colors.length) index = this.colors.length - 1;
    }
    if (value >= ranges[ranges.length - 1]) index = this.colors.length - 1;
    if (index >= this.colors.length) index = this.colors.length - 1;
    color = this.colors[index];
    return color;
  }
  make_layer(type, metric) {
    this.leaflet.eachLayer(lay => this.leaflet.removeLayer(lay));
    if (arguments.length < 2) metric = this.parent.panels.get_selected_metric() || this.parent.defaultMetric;
    if (arguments.length < 1) type = this.visible;
    const resource = this.parent.resources[type];
    const max = this.parent.metrics[metric].getMax(type);
    var ranges = this.parent.metrics[metric].breakpoints[type];
    if (ranges[0] != "") {
      if (ranges.length > 1) {
        this.colors = chroma.scale(['#ffffff',MAIN_COLOUR]).mode('lch').colors(parseInt(ranges.length));
      } else {
        this.colors = chroma.scale(['#ffffff',MAIN_COLOUR]).mode('lch').colors(parseInt(ranges[0]) + 1);
        ranges = '';
      }
    } else {
      this.colors = chroma.scale(['#ffffff',MAIN_COLOUR]).mode('lch').colors(7);
      ranges = '';
    }
    this.colors.shift();

    this.layers[type] = L.geoJSON(resource.geojson, {
      style: feature => {
        const metric = this.parent.panels.get_selected_metric() || this.parent.defaultMetric;
        var color = this.colors[parseInt(feature.properties[metric] / (max / this.colors.length))];
        color = this.get_color(ranges, metric, feature.properties[metric]);
        return { color: 'white', fillColor: color, weight: 1, fillOpacity: 1 }
      },
      onEachFeature: (feature, layer) => {
        layer.on('click', event => {
          this.parent.panels.load_info(feature, event);
        });
      }
    });
    this.layers[type].bindTooltip(layer => {
      return layer.feature.properties.Name;
    }, {opacity: 1, direction: 'top', sticky: true});

  }
  show_layer(name) {
    if (arguments.length === 0) name = this.visible;
    Object.keys(this.layers).forEach(type => {
      var layer = this.layers[type];
      this.leaflet.removeLayer(layer);
    });
    const layer = this.layers[name];
    layer.addTo(this.leaflet);
    this.show_legend();
    this.load_markers();
    return layer;
  }
  show_legend() {
    this.legend.container.innerHTML = '';
    var ranges = this.get_ranges();
    this.colors.forEach((color, index) => {
      var breakpoint = document.createElement('div');
      breakpoint.style.backgroundColor = color;
      var label = document.createElement('label');
      label.classList.add('left');
      var value = ranges[index];
      if (value > 10000) {
        value = Math.round(value / 1000);
        value = value + 'k';
        label.style.left = - ('' + value).length * 3;
      }
      if (value > 1000) {
        value = Math.round(value / 100) / 10;
        value = value + 'k';
        label.style.left = - ('' + value).length * 2;
      }
      label.innerHTML = value;
      breakpoint.appendChild(label);
      if (index === this.colors.length - 1) {
        var label = document.createElement('label');
        label.classList.add('right');
        var value = ranges[index + 1];
        if (value > 10000) {
          value = Math.round(value / 1000);
          value = value + 'k';
        }
        if (value > 1000) {
          value = Math.round(value / 100) / 10;
          value = value + 'k';
        }
        label.innerHTML = value;
        label.style.right = 0;
        breakpoint.appendChild(label);
      }
      this.legend.container.appendChild(breakpoint);
    });
  }
  get_ranges() {
    var visible = 'constituencies';
    if (typeof this.parent.map !== 'undefined') visible = this.parent.map.visible;
    var ranges = this.parent.metrics[this.parent.panels.get_selected_metric()].breakpoints[visible];
    if (ranges[0] != "") {
      if (ranges.length === 1) {
        var num_values = ranges[0];
      } else {
        return ranges;
      }
    } else {
      var num_values = 6;
    }
    const max = this.parent.metrics[this.parent.panels.get_selected_metric()].getMax(visible);
    var spacing = max / num_values;
    for (var i = 0; i < num_values; ++i) {
      ranges[i] = parseInt(i * spacing * 1) / 1;
    }
    ranges.push(max);
    return ranges;
  }
  load_map() {

  }
}

export { MapPanel };
