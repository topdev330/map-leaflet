/*
A map component to be embedded in a page.

It plots choroplet maps of the English regions and constituencies and draws the data from a Google Sheet spreadsheet with a specific format.

It also plots markers as points on the map.

Author: Marc Compte (marc@compte.cat)
*/
import 'materialize-css/dist/css/materialize.min.css';
import 'materialize-css/dist/js/materialize.min';
import 'material-icons/iconfont/material-icons.scss';
import './styles.scss';
var L = require('leaflet');
import { InfoPanel } from './components/info-panel.js';
import { MapPanel } from './components/map-panel.js';
import { MAIN_COLOUR, SELECTION_COLOUR, MARKERS_MIN_ZOOM, SMOOTH_ZOM_DURATION } from './config.js';


var API_KEY = 'AIzaSyC1NXtVttkwJXF9OcS8PBQAObx-_mTj7Ps';
var DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
var SCOPES = "https://www.googleapis.com/auth/spreadsheets.readonly";

document.addEventListener('DOMContentLoaded', (event) => {
  const containers = document.querySelectorAll('[data-map-source-id]');
  containers.forEach((container) => {
    new ReportMap(container);
  });
});


class ReportMap {
  constructor(container) {
    this.container = container;
    this.container.classList.add('report-map-container');
    this.mapSourceId = container.dataset.mapSourceId;
    this.defaultMetric = container.dataset.mapDefaultMetric;
    this.panelWidth = container.dataset.mapPanelWidth;
    this.ranges = {
      'regions': 'Regions!A1:ZZ1000',
      'constituencies': 'Constituencies!A1:ZZ10000',
    };
    this.metrics = {};
    this.resources = {};
    this.tabs = [];
    container.dataset.mapGeometries.split(',').forEach(geometry => {
      this.resources[geometry] = {};
    });
    this.init();
  }
  create_info_panel() {
    gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES
      }).then(result => {
        this.panels = new InfoPanel(this);
        this.load_geometries();
      });
  }
  init() {
    if (typeof this.panelWidth !== "undefined") {
      const width = parseInt(this.panelWidth);
      this.container.style.grid = "100% / " + width + "px auto";
    }
    gapi.load('client', this.create_info_panel.bind(this));
  }
  load_geometries() {
    let promises = [];
    Object.keys(this.resources).forEach(geometry => {
      promises.push(fetch(geometry + '.geojson'));
    });
    Promise.all(promises).then(responses => {
      return Promise.all(responses.map(result => result.json()));
    }).then(geojsons => {
      this.load_data(geojsons);
    });
  }
  csv2geojson(data, geometry) {
    const headers = data.shift(0);
    geometry.features.forEach(feature => {
      data.forEach((row, idx) => {
        if (row[headers.indexOf('Code')] === feature.properties.Code) {
          headers.forEach(field => {
            // Calculate max values for each metric
            var value = parseFloat(row[headers.indexOf(field)].replace(',',''));
            if ( !isNaN(value) ) {
              if (! ("max" in this.metrics[field])) {
                this.metrics[field]["max"] = {};
              }
              if (! (geometry.name in this.metrics[field]["max"])) {
                this.metrics[field]["max"][geometry.name] = 0;
              }
              this.metrics[field].max[geometry.name] = Math.max(this.metrics[field].max[geometry.name], value);
            } else {
              value = row[headers.indexOf(field)];
            }
            feature.properties[field] = value;
          });
        }
      });
    });
    return geometry;
  }
  load_data(layers) {
    gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: DISCOVERY_DOCS,
        scope: SCOPES
      }).then(result => {
        let promises = [];
        Object.keys(this.resources).forEach(geometry => {
          promises.push(gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: this.mapSourceId,
            range: this.ranges[geometry]
          }));
        });
        promises.push(
            gapi.client.sheets.spreadsheets.values.get({
              spreadsheetId: this.mapSourceId,
              range: 'Markers!A1:F10000'
            })
        );
        // promises.push(
        //     gapi.client.sheets.spreadsheets.values.get({
        //       spreadsheetId: this.mapSourceId,
        //       range: 'Pins!A1:D10000'
        //     })
        // );
        Promise.allSettled(promises).then(responses => {
          responses.forEach(response => {
            if (response.status === 'fulfilled') {
              this.parse_sheet_values(layers, response.value);
            }
          });
          this.finish_loading();
        });
      });
  }
  parse_sheet_values(layers, response) {
    var id = response.result.range.split('!');
    const type = id[0].toLowerCase();
    const range = id[1];
    var layer = layers.find(alayer => {
      return alayer.name === type;
    });
    this.resources[type] = {
      range: range,
      raw: response.result.values,
    }
    if (!response.result.range.startsWith('Markers!') &&
        !response.result.range.startsWith('Pins!')) {
      this.resources[type].metrics = this.get_resource_metrics(response.result.values);
      this.resources[type].geojson = this.csv2geojson(response.result.values, layer)
    } else {
      this.resources[type].geojson = this.marker2geojson(response.result.values);
    }
  }
  get_resource_metrics(data) {
    var metrics = [];
    data[0].forEach(field => {
      if (field in this.metrics) {
        metrics.push(field);
      }
    });
    return metrics;
  }
  marker2geojson(data) {
    var geojson = {
      type: 'FeatureCollection',
      features: []
    }
    data.shift();
    data.forEach(marker => {
      if (marker[2] !== 'FAILED' && marker[3] !== 'FAILED' && typeof marker[3] !== 'undefined' && typeof marker[2] !== 'undefined' && marker[3] !== '' && marker[2] !== '') {
        geojson.features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [marker[3], marker[2]]
          },
          properties: {
            name: marker[0],
            post_code: marker[1],
            radius: parseInt(marker[4]),
            type: parseInt(marker[5])
          }
        });
      }
    });
    return geojson;
  }
  setup_interface() {
    this.map = new MapPanel(this);
  }
  finish_loading() {
    this.setup_interface();
    if (Object.keys(this.map.layers).length > 1) {
      this.setup_baselayer_switch();
    }
    this.setup_search();
    M.AutoInit();
  }
  update_layers_button(type) {
    const tooltip_text = 'Switch to ' + type.toLowerCase();
    var button = this.container.querySelector('.fixed-action-btn a');
    button.dataset.tooltip = tooltip_text;
    var help_text = this.container.querySelector('.switch_help_text');
    help_text.innerHTML = tooltip_text;
    var tooltip = document.querySelector('.material-tooltip');
    if (tooltip !== null) tooltip.style.opacity = 0;
  }
  update_metrics_selector() {
    this.metrics_selector.innerHTML = '';
    var changed_default = false;
    var chosen_metric = this.panels.get_selected_metric() || this.defaultMetric;
    var sample_feature = this.resources[this.map.visible].geojson.features[0].properties;
    Object.keys(this.metrics).forEach((metric, idx) => {
      if (metric === 'id') return;
      if ( !(metric in sample_feature) || (
        typeof this.metrics[metric].tab !== 'undefined' && !this.metrics[metric].tab.selected
      ) ) return;
      var option = document.createElement('option');
      option.setAttribute('value', metric);
      option.innerHTML = metric;
      if (metric === chosen_metric) {
        option.setAttribute('selected', 'true');
        changed_default = true;
      }
      this.metrics_selector.appendChild(option);
    });
    if (!changed_default) {
      this.metrics_selector.options[0].setAttribute('selected', 'true');
    }
    this.map.make_layer();
    this.map.show_layer();
    M.AutoInit();
  }
  get_non_selected() {
    const available = Object.keys(this.resources);
    available.splice(available.indexOf(this.map.visible), 1);
    return available[0];
  }
  update_search() {
    var elems = this.container.querySelectorAll('.autocomplete');
    var options = {
      data: {},
      onAutocomplete: (selected) => {
        var layer = this.map.layers[this.map.visible].getLayers().find(layer => {
          return layer.feature.properties.Name === selected;
        });
        this.map.leaflet.flyToBounds(layer.getBounds(), {padding: [50, 50], duration: SMOOTH_ZOM_DURATION});
        var reload_time = 0;
        if (this.panels.ContentPanel.container.classList.contains('visible')) reload_time = 301;
        this.panels.hide_info();
        setTimeout(() => {
          this.panels.load_info(layer.feature, layer);
        }, reload_time);
      }
    }
    this.resources[this.map.visible].raw.forEach(elem => {
      options.data[elem[0]] = null;
    })
    setTimeout(() => {
      this.search = M.Autocomplete.init(elems, options);
    }, 100);
    var label = this.container.querySelector('.search_container label');
    label.innerHTML = `Search ${this.map.visible}`;
  }
  setup_search() {
    const content = `
      <div class="col s12">
        <div class="row">
          <div class="input-field col s12">
            <i class="material-icons prefix">search</i>
            <input type="text" class="autocomplete">
            <label for="autocomplete-input">Search ${this.map.visible}</label>
          </div>
        </div>
      </div>
    `;
    var search = document.createElement('div');
    search.classList.add('row');
    search.classList.add('search_container');
    search.classList.add('unfolded');
    search.innerHTML = content;
    this.container.appendChild(search);
    var search_icon = this.container.querySelector('.search_container i');
    search_icon.addEventListener('pointerup', event => {
      if (search.classList.contains('unfolded')) {
        search.classList.remove('unfolded');
      } else {
        search.classList.add('unfolded');
        setTimeout(() => {
          search.querySelector('input').focus();
        }, 301);
      }
    });
    this.update_search();
  }
  setup_baselayer_switch() {
    const available = this.get_non_selected();
    this.button({
      layer: this.map.visible,
      tooltip: 'Switch to ' + available.toLowerCase(),
      icon: 'layers',
      size: 'large',
      onclick: event => {
        const available = this.get_non_selected();
        this.update_layers_button(this.map.visible);
        this.map.visible = available;
        this.update_metrics_selector();
        this.map.make_layer();
        this.map.show_layer();
        this.update_search();
      }
    });
    this.update_layers_button(available);
    this.update_metrics_selector();
  }
  button(params) {
    if ( !('tooltip_direction' in params) ) {
      params.tooltip_direction = 'top';
    }
    if (params.size) {
      params.size = 'btn-' + params.size;
    }
    var btn = document.createElement('div');
    btn.classList.add('fixed-action-btn');
    var html = `
        <a class="btn-floating ${params.size} tooltipped" data-tooltip="${params.tooltip}" data-position="${params.tooltip_direction}">
          <i class="large material-icons">${params.icon}</i>
        </a>
        <div class="switch_help_text" style="float:right; text-align:right;padding-right: 4px; font-weight: bold;">${params.tooltip}</div>
        `;
    btn.innerHTML = html;
    this.map.container.appendChild(btn);
    if (params.onclick) {
      btn.addEventListener('pointerup', params.onclick);
    }
  }
}
