import L from "leaflet";
import React from "react";
import storeData from "./data.json"; // Store list
import storeDetails from "./store_details1.json"; // Store performance data
import { Map, Marker, TileLayer, Tooltip } from "react-leaflet";
import { TextField, Select, SelectItem, BlockText, TableChart, NerdGraphQuery, NrqlQuery } from "nr1";

// Custom store icons
import storeIconGreen from './icon/green.png';
import storeIconRed from './icon/red.png';
import storeIconYellow from './icon/yellow.png';
//import storeIconBlack from './icon/black.png';

const iconGreen = new L.Icon({ iconUrl: storeIconGreen, iconSize: [20, 20], iconAnchor: [15, 20], popupAnchor: [0, -20] });
const iconRed = new L.Icon({ iconUrl: storeIconRed, iconSize: [20, 20], iconAnchor: [15, 20], popupAnchor: [0, -20] });
const iconYellow = new L.Icon({ iconUrl: storeIconYellow, iconSize: [20, 20], iconAnchor: [15, 20], popupAnchor: [0, -20] });
//const iconBlack = new L.Icon({ iconUrl: storeIconBlack, iconSize: [20, 20], iconAnchor: [15, 20], popupAnchor: [0, -20] });

export default class HomeNerdlet extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      searchStoreId: '',
      selectedType: '',
      selectedStore: null,
      hoveredStore: null,
      mousePosition: { x: 0, y: 0 },
      results: storeData.length > 0 ? storeData : [],
      filtered: props.mapLocations || [],
      nrqlData: null,
      storesData: storeData.length > 0 ? storeData : [], // New state for processed store data
    };
  }

  componentDidMount() {
    const updatedData = this.calculateStoreUptime(storeData, storeDetails.facets);
    this.setState({ storesData: updatedData });
  }

  calculateStoreUptime(stores, facetsData) {
    // Create a map of store numbers to their uptime percentages
    const uptimeMap = {};

    // Group facets by store number and calculate percentages
    facetsData.forEach(facet => {
      const storeNumber = facet.name[0];
      const status = facet.name[2];
      const uniqueCount = facet.results[0]?.uniqueCount || 0;

      if (!uptimeMap[storeNumber]) {
        uptimeMap[storeNumber] = {
          online: 0,
          offline: 0
        };
      }

      if (status === "Online") {
        uptimeMap[storeNumber].online = uniqueCount;
      } else if (status === "Offline") {
        uptimeMap[storeNumber].offline =uniqueCount;
      }
    });

    // Calculate uptime percentage and add to store data
    const updatedStores = stores.map(store => {
      const storeStats = uptimeMap[store.storeNumber] || {online:0, offline:0};
      let uptimePercentage = 0;

      if (storeStats) {
        const total = storeStats.online + storeStats.offline;
        uptimePercentage = total > 0 ? (storeStats.online / total) * 100 : 0;
      }

      return {
        ...store,
        uptimePercentage: parseFloat(uptimePercentage.toFixed(2)),
        storeIcon: this.getStoreIcon(parseFloat(uptimePercentage.toFixed(2)))
      };
    });

    return updatedStores;
  }

  getStoreIcon(percentage) {
   // if (percentage === 0) return iconBlack;
    if (percentage <= 50) return iconRed;
    if (percentage <= 80) return iconYellow;
    return iconGreen;
  }

  //data from json file
  getStoreDetails(storeNumber) {
    if (!storeNumber) return null;
    const storeNumberStr = String(storeNumber);
    return storeDetails.facets.find((detail) => String(detail.name) === storeNumberStr) || null;
  }

  //pos data from nrql query
  async getStoreDetailsFromQuery (storeNumber) {
    if (!storeNumber) return null;
    const storeNumberStr = String(storeNumber);
    const nrqlQuery = `{
      actor {
        account(id: 2828326) {
          nrql(query: "FROM StoreVHQDeviceSample SELECT uniqueCount(serialNumber) AS 'POS' WHERE store ='${storeNumber}' FACET store, CASES(WHERE deviceStatus = 'Active' AS 'Online', WHERE deviceStatus = 'Inactive' AS 'Offline') SINCE 1 day ago LIMIT MAX") {
            results
          }
        }
      }
    }`;

    try {
      const response = await NerdGraphQuery.query({ query: nrqlQuery });
      const details = response.data.actor.account.nrql.results || [];

      this.setState({ selectedStore: { ...this.state.selectedStore, details } });
    } catch (error) {
      console.error("Error fetching store details:", error);
    }
  }

  handleStoreSelection = async (storeNumber) => {
    const store = this.state.storesData.find((s) => String(s.storeNumber) === String(storeNumber));
    if (store) {
      const details = this.getStoreDetails(storeNumber);
      this.setState({ selectedStore: { ...store, details } });
    } else {
      this.setState({ selectedStore: null });
    }
  }

  handleMarkerClick(store) {
    const dashboardUrl = store.dashboardUrl || `https://one.newrelic.com/dashboards/detail/MzgxNDgyOXxWSVp8REFTSEJPQVJEfGRhOjU3Njk4Mjc`;
    const variables = {
      "name": "select_site_name",
      "items": null,
      "defaultValues": [
        {
          "value": {
            "string": "1"
          }
        }
      ]
    };

    // Dynamically construct variables ONLY using variables_all
    const constructedVariables = { [variables.name]: variables.defaultValues[0].value.string, };
    const variableParams = Object.entries(constructedVariables).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join("&");
    console.log(dynamicUrl);
    const dynamicUrl = `${dashboardUrl}?${variableParams}`;
    window.open(dashboardUrl, "_blank"); // Open in a new tab
  }

  handleMouseOver(store, event) {
    this.setState({
      hoveredStore: store,
      mousePosition: { x: event.clientX, y: event.clientY },
    });
  }

  handleMouseOut() {
    this.setState({ hoveredStore: null });
  }

  render() {
    const { searchStoreId, selectedType, selectedStore, hoveredStore, mousePosition, storesData } = this.state;
    const defaultMapCenter = [37.7749, -122.4194];

    // Filter stores based on searchStoreId or selectedType
    const filteredResults = storesData.filter((store) => {
      const matchesId = searchStoreId ? String(store.storeNumber) === String(searchStoreId) : true;
      const matchesType = selectedType ? store.typeCode === selectedType : true;
      return matchesId && matchesType;
    });

    return (
      <div className="dashboard-container" style={{ display: "flex", flexDirection: "column"}}>
        <div className="filters" style={{ display: "flex", padding: "10px", borderBottom: "1px solid #ccc" }}>
          {/* Search Box for Store ID */}
          <TextField
            placeholder="Enter Store ID (e.g., 2221)"
            onChange={(event) => this.setState({ searchStoreId: event.target.value.trim() })}
            onKeyPress={(event) => {
              if (event.key === "Enter") this.handleStoreSelection(searchStoreId);
            }}
          />

          {/* Store Type Dropdown */}
          <Select
            value={selectedType}
            onChange={(event, value) => this.setState({ selectedType: value })}
            placeholder="Filter by Store Type"
          >
            <SelectItem value="">All Types</SelectItem>
            <SelectItem value="FL">Full Line</SelectItem>
            <SelectItem value="RK">Rack</SelectItem>
            <SelectItem value="VS">Virtual Store Express</SelectItem>
            <SelectItem value="NL">Local</SelectItem>
            <SelectItem value="DC">Distribution Center</SelectItem>
            <SelectItem value="HQ">Headquarters</SelectItem>
            <SelectItem value="CO">Contact Center</SelectItem>
            <SelectItem value="WH">Warehouse</SelectItem>
            <SelectItem value="EX">Expense</SelectItem>
          </Select>
        </div>

        <div style={{ display: "flex", flex: 1}}>
          {/* Sidebar */}
          <div className="sidebar" style={{ width: "170px", padding: "10px", borderRight: "5px solid #ccc"}}>
            <h3>Store Overview</h3>
            {filteredResults.map((store, i) => (
              <div key={i} style={{ margin: "10px 0", padding: "10px", border: "1px solid #eee", borderRadius: "5px" }}>
                <strong>{store.name}</strong>
                <p><strong>Store #:</strong>{store.storeNumber}</p>
                <p><strong>Type:</strong> {store.typeDesc}</p>
                <p><strong>Address:</strong> {store.postalAddress.stdzdLine1Text}, {store.postalAddress.stdzdCityName}, {store.postalAddress.origStateCode}</p>
              </div>
            ))}
          </div>

          {/* Map with Store Data */}
          <div style={{ flex: 1 }}>
            <Map center={defaultMapCenter} zoom={3} style={{ height: "100vh", width: "100%", backgroundColor: "#000" }}>
              <TileLayer
                attribution="&copy OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filteredResults.map((store, i) => (
                    <Marker
                      key={i}
                      position={[store.postalAddress.latitude, store.postalAddress.longitude]}
                      icon={store?.storeIcon}
                      eventHandlers={{
                        onClick: () => this.handleMarkerClick(store),// Open New Relic dashboard
                        onMouseOver: (event) => this.handleMouseOver(store, event),
                        onMouseOut: () => this.handleMouseOut(),
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
                        <div>
                          <strong>{store?.name}</strong>                          <br />
                          Store #: {store?.storeNumber}                           <br />
                          POS Availabilty: {store.uptimePercentage}%
                        </div>
                      </Tooltip>
                    </Marker>
                ))}
            </Map>
          </div>

          {/* Display Store Details */}
          <div className="metrics-panel" style={{ width: "300px", padding: "10px", borderLeft: "5px solid #ccc" }}>
            <h3>Performance Metrics</h3>
         { filteredResults.map((store, i) => (
          <TableChart
            key={i}
            accountId={2828326}
            query={`from StoreVHQDeviceSample SELECT uniqueCount(serialNumber)  WHERE store = '${store?.storeNumber}' FACET store, CASES(WHERE deviceStatus = 'Active' AS 'Online', WHERE deviceStatus = 'Inactive' AS 'Offline') SINCE 1 day ago LIMIT MAX`}
          />
          ))}
          </div>
        </div>
      </div>
    );
  }
}
