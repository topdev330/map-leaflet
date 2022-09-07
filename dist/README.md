# README #

A map component to be embedded in a page.

It plots choropleth maps of the English regions and constituencies and draws the data from a Google Sheet spreadsheet with a specific format.

It also plots markers (pins) on the map.

## Requirements

To use the component we need two things:

1. A Google Sheets spreadsheet with the following features.
1. Embed the code in the HTML page.

### Spreadsheet

*See the sample spreadsheet at [https://docs.google.com/spreadsheets/d/1jY24N8SR6I4DSb_5Yqy_zIv9E5TA4XlpWLIuylU41lE](https://docs.google.com/spreadsheets/d/1jY24N8SR6I4DSb_5Yqy_zIv9E5TA4XlpWLIuylU41lE)*

*All names must be kept as mentioned with the same casing (case sensitive)*

*All data should start at row 1, column 1, with a header on the first row and the actual data starting at row 2*

#### Regions/constituencies

- If we want to plot the UK regions there needs to be one sheet/tab named "Regions".
- If we want to plot the UK constituencies there needs to be one sheet/tab named "Constituencies".
- Both sheets/tabs should include the same columns/fields.
    - A field "Name" with the name of the region/constituency.
    - A field "Code" with the official code. This is used to match the spreadsheet with the geometries.
    - A field "Sentence" with a short text to be used on the sliding information panel.
    - Any other field that we want to use as metrics.
        - Regions and constituencies may have different metrics.
        - No case transformation is done on the names of the metrics (they will be shown exactly as written here).
        - The values of the metrics should be without formatting. The map will format the numbers according to the GB standard.

#### Metrics

The metrics are stored together with the Regions/Constituencies tabs. To be able to add as many metrics as you like and to define custom breakpoints for the choropleths, there must be another sheet/tab:

- The sheet must be named "Metrics".
- Each metric may have two columns.
- The first column is compulsory and should have the name of the metric to be used (as written in the Regions/Constituencies tabs).
- The second column and third column may contain a custom set of breakpoints for the colour coding. Each of the columns should have the exact same name as the data sheets (Regions/Constituencies).
  - If we define a comma-separated list of breakpoints it will use those, strictly as indicated.
  - Alternatively, we can indicate a single number N, in which case, the map will plot the choropleths in N ranges evenly spaced.
  - If we don't indicate anything it will use 6 evenly spaced ranges.
  - If a dataset (Regions/Constituencies) does not have a particular metric, the ranges on this sheet will be ignored for that dataset.
- The third column may be used to write a category or group name. If a third column is used, all the metrics should have a value on that column. This will segment all the metrics and organize them in categories. There will be a UI selector to pick the category and this will filter the metrics used on the metric dropdown selector and the ones appearing on the information panel when clicking a polygon on the map.


#### Markers

To plot the markers in the map, we need another sheet/tab named "Markers", with the following columns:

- A first column indicating the "Name" of the marker.
- A second column with the "Post Code" of the marker (or left empty, the map does not use this column).
- A third column with the Latitude of the marker.
- A fourth column with the Longitude of the marker.

To obtain the last two fields we can use the following process:

1. Copy the entire B column (Post Code)
1. Go to [https://www.doogal.co.uk/BatchGeocoding.php](https://www.doogal.co.uk/BatchGeocoding.php)
1. Paste the Post Codes you just copied on the form input
1. Remove the first line (the header "Post Code")
1. Untick all options
1. Select "Separate text output with" tabs
1. Do not include any additional columns
1. Click on Geocode and wait until it finished
1. On the results section, select "Text"
1. Copy the entire result
1. On this spreadsheet, click on C1 and paste.

*I chose to do this process this way (instead of geocoding the postal code on runtime) because it would delay the loading of the map too much.*

This geocoding seems to be working fine, although according to the author in some cases it may return a FAILED, FAILED result, which can be due to either a non existing post code or a very new post code added in the system.

*During the test, 2 out of the 500 post codes provided returned FAILED, FAILED.*

### Embedding the map

*You can see an example in the index.html file included in this directory.*

To embed the map into an HTML page we need to do the following things:

1. Upload to the server the files provided in the "dist" folder (or "dist" zipfile). These include:
  1. The geojson files (regions.geojson and constituencies.geojson). *These files have been created by downloading them from https://geoportal.statistics.gov.uk/ and optimizing their resolution to reduce their size.*
  1. The javascript file map-bundle.js.
  1. The leaflet stylesheet leaflet.css.
  1. The "fonts" folder. This folder is necessary for the icons used on the search and layer switching (regions/constituencies) buttons.
1. Add the resources to your HTML. You must include the following code inside the <HEAD> HTML tag:
```
<script src="https://apis.google.com/js/api.js"></script>
<script type="module" src="map-bundle.js"></script>
<link rel="stylesheet" href="leaflet.css">
```
1. Indicate the anchors for the maps and their configuration within your HTML:
```
<div data-map-source-id="1jY24N8SR6I4DSb_5Yqy_zIv9E5TA4XlpWLIuylU41lE"
     data-map-geometries="constituencies,regions"
     data-map-default-metric="GVA"
     data-map-zoom-controls="true"
     data-map-reset-view-control="false"
     data-map-panel-width="300"
     width="100%" style="height: 400px;">
```
Where:

- **data-map-source-id**
Should contain the id of your spreadsheet as it appears in its URL:
docs.google.com/spreadsheets/d/**1jY24N8SR6I4DSb_5Yqy_zIv9E5TA4XlpWLIuylU41lE**/edit
- **data-map-geometries**
Should indicate which geometries you want the map to include (regions and/or constituencies). You can choose to include both of them or only one. If you indicate the two, the first one will be the one appearing on startup.
- **data-map-defaul-metric**
Should indicate which metric de you want to display the map on startup.
- **data-map-zoom-controls**
Indicates whether the map should have zoom controls (in and out). *Defaults to false*.
- **data-map-reset-view-control**
Indicates whether the map should have a button to reset the initial view. *Defaults to false*.
- **data-map-panel-width**
Set a custom width for the side panel. *Default: 250px*.
- **width**
Is the width of the component.
- **style**
It must indicate the height of the map as a style rule and not an HTML tag attribute. You can choose to do this also via CSS rules.
