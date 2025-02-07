import React from "react";
import { TextField, Select, SelectItem, BlockText, Button, TableChart, NerdGraphQuery } from "nr1";
import { Map, Marker, TileLayer, Tooltip } from "react-leaflet";
import L from "leaflet";

// Custom store icons
import storeIconGreen from "./icon/green.png";
import storeIconRed from "./icon/red.png";
import storeIconYellow from "./icon/yellow.png";

const iconGreen = new L.Icon({ iconUrl: storeIconGreen, iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -30] });
const iconRed = new L.Icon({ iconUrl: storeIconRed, iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -30] });
const iconYellow = new L.Icon({ iconUrl: storeIconYellow, iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -30] });

export default class HomeNerdlet extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      searchStoreId: "",
      selectedType: "",
      selectedStore: null,
      results: [], // Stores dynamically fetched results
    };
  }

  async getStoreDetails(storeNumber) {
    if (!storeNumber) return;

    const nrqlQuery = `{
      actor {
        account(id: YOUR_ACCOUNT_ID) {
          nrql(query: "FROM StoreVHQDeviceSample SELECT uniqueCount(serialNumber) AS 'POS' WHERE name ='${storeNumber}' FACET name,deviceStatus CASES(WHERE deviceStatus = 'Active' AS 'Online', WHERE deviceStatus = 'Inactive' AS 'Offline') SINCE 1 day ago LIMIT MAX") {
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
    const store = this.state.results.find((s) => String(s.storeNumber) === String(storeNumber));
    if (store) {
      this.setState({ selectedStore: store }, () => this.getStoreDetails(storeNumber));
    } else {
      this.setState({ selectedStore: null });
    }
  };

  handleMarkerClick = (store) => {
    const dashboardUrl = store.dashboardUrl || `https://newrelic.com/store/${store.storeNumber}`;
    window.open(dashboardUrl, "_blank");
  };

  getStoreIcon(healthScore) {
    if (healthScore < 50) return iconRed;
    if (healthScore < 80) return iconYellow;
    return iconGreen;
  }

  calculateOnlinePercentage() {
    const details = this.state.selectedStore?.details;
    if (!details || details.length === 0) return 0;

    let onlineCount = 0;
    let offlineCount = 0;

    details.forEach((result) => {
      if (result.deviceStatus === "Online") {
        onlineCount = result.POS || 0;
      } else if (result.deviceStatus === "Offline") {
        offlineCount = result.POS || 0;
      }
    });

    const totalDevices = onlineCount + offlineCount;
    return totalDevices === 0 ? 0 : (onlineCount / totalDevices) * 100;
  }

  render() {
    const { searchStoreId, selectedType, selectedStore, results } = this.state;
    const defaultMapCenter = [37.7749, -122.4194];

    const filteredResults = results.filter((store) => {
      const matchesId = searchStoreId ? String(store.storeNumber) === String(searchStoreId) : true;
      const matchesType = selectedType ? store.typeCode === selectedType : true;
      return matchesId && matchesType;
    });

    return (
      <div className="dashboard-container" style={{ display: "flex", flexDirection: "column" }}>
        {/* Filters at the Top */}
        <div className="filters" style={{ display: "flex", padding: "10px", borderBottom: "1px solid #ccc" }}>
          <TextField
            placeholder="Enter Store ID (e.g., 2221)"
            onChange={(event) => this.setState({ searchStoreId: event.target.value.trim() })}
          />
          <Select
            value={selectedType}
            onChange={(event, value) => this.setState({ selectedType: value })}
            placeholder="Filter by Store Type"
          >
            <SelectItem value="">All Types</SelectItem>
            <SelectItem value="RE">Retail</SelectItem>
            <SelectItem value="FL">Full Line</SelectItem>
            <SelectItem value="RK">Rack</SelectItem>
            <SelectItem value="DC">Distribution Center</SelectItem>
          </Select>
        </div>

        <div style={{ display: "flex", flex: 1 }}>
          {/* Sidebar */}
          <div className="sidebar" style={{ width: "300px", padding: "10px", borderRight: "1px solid #ccc" }}>
            <h2>Store Overview</h2>
            {filteredResults.map((store, i) => (
              <div key={i} style={{ margin: "10px 0", padding: "10px", border: "1px solid #eee", borderRadius: "5px" }}>
                <strong>{store.name}</strong>
                <p>Store #: {store.storeNumber}</p>
                <p>Type: {store.typeDesc}</p>
                <p>Health: {store.healthScore}</p>
              </div>
            ))}
          </div>

          {/* Map */}
          <div style={{ flex: 1 }}>
            <Map center={defaultMapCenter} zoom={3} style={{ height: "100vh", width: "100%" }}>
              <TileLayer
                attribution="&copy OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filteredResults.map((store, i) => (
                <Marker
                  key={i}
                  position={[store.postalAddress.latitude, store.postalAddress.longitude]}
                  icon={this.getStoreIcon(store.healthScore)}
                  eventHandlers={{
                    click: () => this.handleMarkerClick(store),
                  }}
                >
                  <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
                    <div>
                      <strong>{store.name}</strong>
                      <br />
                      Store Number: {store.storeNumber}
                      <br />
                      Health Score: {store.healthScore}
                      <br />
                      Type: {store.typeDesc}
                    </div>
                  </Tooltip>
                </Marker>
              ))}
            </Map>
          </div>

          {/* Metrics Panel */}
          <div className="metrics-panel" style={{ width: "300px", padding: "10px", borderLeft: "1px solid #ccc" }}>
            <h2>Performance Metrics</h2>
            {selectedStore ? (
              <div>
                <h3>Online Percentage: {this.calculateOnlinePercentage().toFixed(2)}%</h3>
                <TableChart
                  accountId={YOUR_ACCOUNT_ID}
                  query={`FROM StoreVHQDeviceSample SELECT uniqueCount(serialNumber) AS 'POS' WHERE name ='${selectedStore.storeNumber}' FACET name,deviceStatus CASES(WHERE deviceStatus = 'Active' AS 'Online', WHERE deviceStatus = 'Inactive' AS 'Offline') SINCE 1 day ago LIMIT MAX`}
                  fullWidth
                />
              </div>
            ) : (
              <BlockText>No store selected. Click on a store marker to view details.</BlockText>
            )}
          </div>
        </div>
      </div>
    );
  }
}
