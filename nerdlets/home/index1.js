import React from "react";
import { TableChart, TextField, Select, SelectItem, BlockText } from "nr1";
import { Map, CircleMarker, TileLayer, Tooltip } from "react-leaflet";
import storeData from "./data.json"; // Store list
import storeDetails from "./store_details.json"; // Store performance data

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
    };
  }

  getMarkerColor(healthScore) {
    return healthScore >= 80 ? "#11A600" : healthScore >= 50 ? "#FFD966" : "#BF0016";
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
      this.setState({ selectedStore: { ...store, details } });
    } else {
      this.setState({ selectedStore: null });
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

  render() {
    const { searchStoreId, selectedType, selectedStore, hoveredStore, mousePosition, results } = this.state;
    const defaultMapCenter = [37.7749, -122.4194];

    // Filter stores based on searchStoreId or selectedType
    const filteredResults = results.filter((store) => {
      const matchesId = searchStoreId ? String(store.storeNumber) === String(searchStoreId) : true;
      const matchesType = selectedType ? store.typeCode === selectedType : true;
      return matchesId && matchesType;
    });

    return (
      <div className="container">
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
          <SelectItem value="RE">Retail</SelectItem>
          <SelectItem value="FL">Full Line</SelectItem>
          <SelectItem value="RK">Rack</SelectItem>
          <SelectItem value="DC">Distribution Center</SelectItem>
        </Select>

        {/* Map with Store Data */}
        <Map center={defaultMapCenter} zoom={3} style={{ height: "500px", width: "100%" }}>
          <TileLayer
            attribution="&copy OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filteredResults.map((store, i) => (
            <CircleMarker
              key={i}
              center={[store.postalAddress.latitude, store.postalAddress.longitude]}
              color={this.getMarkerColor(store.healthScore)}
              radius={8}
              onClick={() => this.handleMarkerClick(store)} // Open New Relic dashboard
              onMouseOver={(event) => this.handleMouseOver(store, event)}
              onMouseOut={() => this.handleMouseOut()}
              style={{ cursor: "pointer" }} // Makes it clear it's clickable
            >
              <Tooltip direction="top" offset={[0, -5]} opacity={1} permanent={false}>
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
            </CircleMarker>
          ))}
        </Map>

        {/* Display Store Details */}
        {selectedStore ? (
          <div className="store-details">
            <h3>Store Details</h3>
            <p><strong>Store Number:</strong> {selectedStore.storeNumber}</p>
            <p><strong>Name:</strong> {selectedStore.name}</p>
            <p><strong>Type:</strong> {selectedStore.typeDesc}</p>
            <p><strong>Health Score:</strong> {selectedStore.healthScore}</p>
            <p><strong>Customer Footfall:</strong> {selectedStore.customerFootfall}</p>
            <p><strong>Status:</strong> {selectedStore.details ? "Online" : "Offline"}</p>

            {/* Performance Stats */}
            {selectedStore.details ? (
              <>
                <h4>Performance Stats</h4>
                <p><strong>Inspected Count:</strong> {selectedStore.details.results?.uniqueCount || "N/A"}</p>
                <p><strong>Response Time:</strong> {selectedStore.details.performanceStats?.responseTime || "N/A"} ms</p>
              </>
            ) : (
              <BlockText>No performance data available for this store.</BlockText>
            )}
          </div>
        ) : (
          <BlockText>No store selected. Click on a store marker or search by store number.</BlockText>
        )}

        {/* Hovered Store Details */}
        {hoveredStore && (
          <div
            className="hovered-store-tooltip"
            style={{
              position: "absolute",
              top: `${mousePosition.y + 10}px`,
              left: `${mousePosition.x + 10}px`,
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              color: "white",
              padding: "10px",
              borderRadius: "5px",
              zIndex: 1000,
            }}
          >
            <strong>{hoveredStore.name}</strong>
            <br />
            Store Number: {hoveredStore.storeNumber}
            <br />
            Health Score: {hoveredStore.healthScore}
            <br />
            Type: {hoveredStore.typeDesc}
          </div>
        )}
      </div>
    );
  }
}
