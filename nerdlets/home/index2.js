import React from "react";
import { TextField, Select, SelectItem, BlockText, NrqlQuery, Button } from "nr1";
import { Map, Marker, TileLayer, Tooltip } from "react-leaflet";
import L from "leaflet";
import storeData from "./data.json"; // Store list
import storeDetails from "./store_details.json"; // Store performance data

import storeIconGreen from './icon/green.png';
import storeIconRed from './icon/red.png';
import storeIconYellow from './icon/yellow.png';

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
      hoveredStore: null,
      mousePosition: { x: 0, y: 0 },
      results: storeData.length > 0 ? storeData : [],
      filterHealthScore: "",
      nrqlData: null,
    };
  }

  getStoreDetails(storeNumber) {
    if (!storeNumber) return null;
    const storeNumberStr = String(storeNumber);
    return storeDetails.facets.find((detail) => String(detail.name) === storeNumberStr) || null;
  }

  handleStoreSelection(storeNumber) {
    const store = this.state.results.find((s) => String(s.storeNumber) === String(storeNumber));
    if (store) {
      const details = this.getStoreDetails(storeNumber);
      this.setState({ selectedStore: { ...store, details } }, () => {
        this.fetchPerformanceMetrics(storeNumber); // Fetch NRQL data
      });
    } else {
      this.setState({ selectedStore: null, nrqlData: null });
    }
  }

  handleMarkerClick(store) {
    const dashboardUrl = store.dashboardUrl || `https://newrelic.com/store/${store.storeNumber}`;
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

  getStoreIcon(percentage) {
    if (percentage >= 80) {
      return iconGreen;  // Green for percentages >= 80
    } else if (percentage >= 50) {
      return iconYellow; // Yellow for percentages between 50 and 79
    } else {
      return iconRed;    // Red for percentages below 50
    }
  }

  calculatePercentage(store) {
    const details = this.getStoreDetails(store); // Ensure this gets the correct store data
    if (!details || !details.facets) return 0; // Handle the case where details or facets are missing
    
    let onlineCount = 0;
    let offlineCount = 0;

    // Sum the counts based on the presence of online/offline attributes
    details.facets.forEach((facet) => {
      if (facet.online === "Online") {
        onlineCount += facet.results.uniqueCount; // Add to the online count
      } else if (facet.offline === "Offline") {
        offlineCount += facet.results.uniqueCount; // Add to the offline count
      }
    });
    const totalCount = onlineCount + offlineCount;

    // Log the total count for debugging
    console.log('Total Count:', totalCount);

    // Calculate and return the percentage
    return totalCount > 0 ? (onlineCount / totalCount) * 100 : 0;
}

  fetchPerformanceMetrics(storeNumber) {
    const query = `SELECT average(duration) as 'Response Time', count(*) as 'Incident Count' 
                   FROM Transaction WHERE storeNumber = '${storeNumber}' SINCE 30 minutes ago`;
    NrqlQuery.query({ accountId: 6248776, query }) // Replace YOUR_ACCOUNT_ID with your actual New Relic account ID
      .then((response) => {
        if (response?.data?.[0]) {
          this.setState({ nrqlData: response.data[0].data[0] });
        } else {
          this.setState({ nrqlData: null });
        }
      })
      .catch((error) => {
        console.error("NRQL query failed:", error);
        this.setState({ nrqlData: null });
      });
  }

  render() {
    const { searchStoreId, selectedType, selectedStore, hoveredStore, mousePosition, results, filterHealthScore, nrqlData } = this.state;
    const defaultMapCenter = [37.7749, -122.4194];

    const filteredResults = results.filter((store) => {
      const matchesId = searchStoreId ? String(store.storeNumber) === String(searchStoreId) : true;
      const matchesType = selectedType ? store.typeCode === selectedType : true;
      const matchesHealth = filterHealthScore ? store.healthScore >= parseInt(filterHealthScore) : true;
      return matchesId && matchesType && matchesHealth;
    });

    return (
      <div className="dashboard-container" style={{ display: "flex", flexDirection: "column" }}>
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
          <Select
            value={filterHealthScore}
            onChange={(event, value) => this.setState({ filterHealthScore: value })}
            placeholder="Filter by Health Score"
          >
            <SelectItem value="">All Scores</SelectItem>
            <SelectItem value="80">80 and above</SelectItem>
            <SelectItem value="50">50 and above</SelectItem>
            <SelectItem value="30">30 and above</SelectItem>
          </Select>
        </div>

        <div style={{ display: "flex", flex: 1 }}>
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

          <div style={{ flex: 1 }}>
            <Map center={defaultMapCenter} zoom={3} style={{ height: "100vh", width: "100%" }}>
              <TileLayer
                attribution="&copy OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filteredResults.map((store, i) => {
                // const percentage = this.calculatePercentage(store);
                const percentage = 72;
                const icon = this.getStoreIcon(percentage);

                return (
                  <Marker
                    key={i}
                    position={[store.postalAddress.latitude, store.postalAddress.longitude]}
                    icon={icon}
                    eventHandlers={{
                      click: () => this.handleMarkerClick(store),
                      mouseover: (event) => this.handleMouseOver(store, event),
                      mouseout: () => this.handleMouseOut(),
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
                        <br />
                        Uptime: {percentage.toFixed(2)}%
                      </div>
                    </Tooltip>
                  </Marker>
                );
              })}
            </Map>
          </div>

          {/* Metrics Panel */}
          <div className="metrics-panel" style={{ width: "300px", padding: "10px", borderLeft: "1px solid #ccc" }}>
            <h2>Performance Metrics</h2>
            {selectedStore ? (
              <div>
                <p><strong>Store:</strong> {selectedStore.name}</p>
                <p><strong>Health Score:</strong> {selectedStore.healthScore}</p>
                {nrqlData ? (
                  <>
                    <p><strong>Response Time:</strong> {nrqlData['Response Time'] || 'N/A'} ms</p>
                    <p><strong>Incident Count:</strong> {nrqlData['Incident Count'] || 0}</p>
                  </>
                ) : (
                  <BlockText>Loading performance metrics...</BlockText>
                )}
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
