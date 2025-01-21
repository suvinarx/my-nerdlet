import React from 'react';
import { TableChart, TextField, Select, SelectItem, BlockText } from 'nr1';
import { Map, CircleMarker, TileLayer } from 'react-leaflet';
import storeData from './data.json';
import storeDetails from './store_details.json';


const nordstromLogo = "/nordstrom_logo.png"; 

export default class HomeNerdlet extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      searchStoreId: '',
      selectedType: '',
      selectedStore: null,
      results: storeData.length > 0 ? storeData : [],
    };
  }

  getMarkerColor(healthScore) {
    return healthScore >= 80 ? '#11A600' : healthScore >= 50 ? '#FFD966' : '#BF0016';
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

  render() {
    const { searchStoreId, selectedType, selectedStore, results } = this.state;
    const defaultMapCenter = [37.7749, -122.4194];

    const filteredResults = results.filter((store) => {
      const matchesId = searchStoreId ? String(store.storeNumber) === String(searchStoreId) : true;
      const matchesType = selectedType ? store.typeCode === selectedType : true;
      return matchesId && matchesType;
    });

    return (
      <div className="container">
        {/* Nordstrom Logo */}
        <div style={{ textAlign: "center", marginBottom: "10px" }}>
  <img src={nordstromLogo} alt="Nordstrom Logo" style={{ width: "200px" }} />
</div>


        {/* Search Box for Store ID */}
        <TextField
          placeholder="Enter Store ID (e.g., 2221)"
          onChange={(event) => this.setState({ searchStoreId: event.target.value.trim() })}
          onKeyPress={(event) => {
            if (event.key === 'Enter') this.handleStoreSelection(searchStoreId);
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

        {/* Display Map */}
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
              radius={5}
              onClick={() => this.handleStoreSelection(store.storeNumber)}
            />
          ))}
        </Map>

        {/* Store Details */}
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
                <p><strong>Inspected Count:</strong> {selectedStore.details.results?.uniqueCount || 'N/A'}</p>
                <p><strong>Response Time:</strong> {selectedStore.details.performanceStats?.responseTime || 'N/A'} ms</p>
              </>
            ) : (
              <BlockText>No performance data available for this store.</BlockText>
            )}
          </div>
        ) : (
          <BlockText>No store selected. Click on a store marker or search by store number.</BlockText>
        )}

        {/* Store Details Table */}
        {selectedStore && selectedStore.details && (
          <TableChart
            accountId={6248776} // Replace with your New Relic Account ID
            query={`
              FROM StoreHealth 
              SELECT 
                sum(totalSales) AS 'Total Sales', 
                average(healthScore) AS 'Health Score', 
                sum(customerFootfall) AS 'Customer Footfall', 
                latest(responseTime) AS 'Response Time', 
                latest(inspectedCount) AS 'Inspected Count'
              WHERE name = '${selectedStore.storeNumber}'
              FACET name 
              SINCE 1 week ago 
              LIMIT 100
            `}
            fullWidth
          />
        )}
      </div>
    );
  }
}
