import { SELECTION_COLOUR } from '../config.js';
import { is_mobile } from '../utils.js';
import { Panel } from './panel.js';

class InfoPanel extends Panel {
  constructor(parent) {
    super('report_map_panel_container', parent);
    this.init();
  }
  init() {
    this.load_metrics();
    this.ContentPanel = new Panel('report_map_panel_content', this);
  }
  make_metric(metric, selected, geom_fields) {
    var tab = metric.length > 3 ? metric[3] : null
    const tabExists = this.parent.tabs.find(t => t.name === tab);
    if (tab && !tabExists ) {
      tab = {
        name: tab,
        selected: false
      };
      this.parent.tabs.push(tab);
    } else {
      tab = tabExists;
    }
    if (typeof tab !== 'undefined' && !tab.selected) tab.selected = selected;
    var obj = {
      breakpoints: {},
      tab: tab,
      selected: selected,
      getMax(geom) {
        if ("max" in this) {
          return this.max[geom];
        } else {
          return 0
        }
      }
    };
    try {
      Object.keys(this.parent.ranges).forEach(geometry => {
        if (metric.length > 1) {
          obj.breakpoints[geometry.toLowerCase()] = metric[geom_fields[geometry.toLowerCase()]].split(',');
        } else {
          obj.breakpoints[geometry.toLowerCase()] = [""];
        }
      });
    } catch(error) {console.error(error)}
    return obj;
  }
  load_metrics() {
    gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: this.parent.mapSourceId,
      range: 'Metrics!A1:H1000'
    }).then(response => {
      const select = document.createElement('select');
      select.setAttribute('name', 'metrics');
      select.setAttribute('id', 'metrics');
      const data = response.result.values;
      var geom_fields = {};
      data.shift();
      data.forEach((metric, idx) => {
        if (idx === 0) {
          metric.forEach((geometry, field_num) => {
            if (geometry.toLowerCase() in this.parent.resources) {
              geom_fields[geometry.toLowerCase()] = field_num;
            }
          });
        } else {
          if (metric[0] != '') {
            var selected = false;
            if (this.parent.defaultMetric === metric[0]) selected = true;
            const obj = this.make_metric(metric, selected, geom_fields);
            this.parent.metrics[metric[0]] = obj;
            if (typeof obj.tab === 'undefined' || obj.tab.selected) {
              var option = document.createElement('option');
              option.setAttribute('value', metric[0]);
              option.innerHTML = metric[0];
              if (this.parent.defaultMetric === metric[0]) option.setAttribute('selected', 'true');
              select.appendChild(option);
            }
          }
        }
      });
      this.parent.metrics_selector = select;
      const wrapper = document.createElement("div");
      if (this.parent.tabs.length) this.add_tabs(wrapper, select);
      wrapper.append(select);
      this.container.prepend(wrapper);
      select.addEventListener('change', event => {
        this.select_metric(select.selectedOptions[0].value);
        this.parent.map.make_layer();
        this.parent.map.show_layer();
      });
      M.AutoInit();
    });
  }
  add_tabs(wrapper, select) {
    const floating = document.createElement("div");
    const button = document.createElement("a");
    button.classList.add("dropdown-trigger");
    button.classList.add("btn-small");
    button.classList.add("btn-floating");
    button.setAttribute("href", "#");
    button.setAttribute("data-target", "tab_list");
    // button.innerHTML = '<span class="material-icons">settings</span>';
    // button.innerHTML = '<span class="material-icons">view_list</span>';
    button.innerHTML = '<span class="material-icons">menu</span>';
    // button.innerHTML = '<span class="material-icons">filter_alt</span>';
    const ul = document.createElement("ul");
    ul.setAttribute("id", "tab_list");
    ul.classList.add("dropdown-content");
    this.parent.tabs.forEach(tab => {
      var li = document.createElement("li");
      li.innerHTML = '<a href="#">' + tab.name + '</a>';
      if (tab.selected) {
        li.classList.add("selected");
      }
      li.addEventListener('pointerup', event => {
        this.select_tab(event);
        this.parent.update_metrics_selector();
        this.select_metric(select.selectedOptions[0].value);
        this.parent.map.make_layer();
        this.parent.map.show_layer();
        button.click();
        button.click();
      });
      ul.append(li);
    });
    floating.append(ul);
    floating.append(button);
    wrapper.append(floating);
  }
  select_tab(event) {
    const tab = event.target.innerHTML;
    const li = event.target.parentElement;
    Object.keys(this.parent.tabs).forEach((tab, index) => {
      li.parentElement.children[index].classList.remove('selected');
      this.parent.tabs[tab].selected = false;
    });
    li.classList.add('selected');
    this.parent.tabs.find(t => t.name == tab).selected = true;
    this.hide_info();
  }
  get_selected_metric() {
    const metric = Object.keys(this.parent.metrics).find(metric => this.parent.metrics[metric].selected);
    if (typeof metric === 'undefined') console.error('[ReportMap] No metric selected.', this.parent.metrics);
    return metric;
  }
  select_metric(metric) {
    Object.keys(this.parent.metrics).forEach(metric => {
      this.parent.metrics[metric].selected = false;
    });
    this.parent.metrics[metric].selected = true;
    this.hide_info();
    this.parent.container.querySelector(".dropdown-trigger.btn-small.btn-floating").click();
    this.parent.container.querySelector(".dropdown-trigger.btn-small.btn-floating").click();
  }
  show_info() {
    this.ContentPanel.container.classList.add('visible');
  }
  hide_info() {
    this.ContentPanel.container.classList.remove('visible');
  }
  load_info(feature, layer) {
    var reload_time = 0;
    if (this.ContentPanel.container.classList.contains('visible')) reload_time = 301;
    this.hide_info();
    var metric_data = [];
    const selected_metric = this.get_selected_metric();
    const selected_value = feature.properties[selected_metric].toLocaleString('en-GB');
    metric_data.push(`<li class="selected_metric_value">
        <value>${selected_value}</value>
        <label>${selected_metric}</label>
    </li>`);
    Object.keys(this.parent.metrics).forEach(metric => {
      if (metric === 'id' || (typeof this.parent.metrics[metric].tab !== 'undefined' && !this.parent.metrics[metric].tab.selected) || selected_metric === metric) return;
      if (metric !== '') var value = feature.properties[metric];
      if (typeof value !== 'undefined') {
        value = value.toLocaleString('en-GB');
        metric_data.push(`<li><label>${metric}</label><value>${value}</value></li>`);
      }
    });
    metric_data = '<ul>' + metric_data.join('') + '</ul>';
    this.parent.map.leaflet.eachLayer(lay => {
      if ('feature' in lay) {
        if (!(lay.feature.geometry.type === 'Point')) {
          if (lay.feature.properties.Code === feature.properties.Code) {
            lay.setStyle({color: SELECTION_COLOUR, weight: 4});
            lay.bringToFront();
          } else {
            lay.setStyle({color:'white', weight: 1});
            lay.bringToBack();
          }
        } else {
          lay.bringToFront();
        }
      }
    })
    setTimeout(() => {
      var close_label = 'close';
      if (is_mobile()) close_label = 'back to map';
      var content = `
      <h5>${feature.properties.Name}</h5>
      <p>${feature.properties.Sentence}</p>
      ${metric_data}
      <div class="close-info-panel-btn"><a class="waves-effect waves-light btn">${close_label}</a></div>
      `;
      this.ContentPanel.container.innerHTML = content;
      this.container.querySelector('.close-info-panel-btn a').addEventListener('pointerup',event => {
        this.hide_info();
      });
      if (is_mobile()) {
        const height = this.parent.container.querySelector('.report_map_map_container').clientHeight;
        this.ContentPanel.container.style.height = height;
      }
      this.show_info();
    }, reload_time);
  }
}

export { InfoPanel };
