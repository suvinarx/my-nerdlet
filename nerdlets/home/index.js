import React, { useState, useLayoutEffect } from "react";
import { TextField, Select, SelectItem, BlockText } from "nr1";
import { Map, Marker, TileLayer, Tooltip } from "react-leaflet";
import L from "leaflet";
import storeData from "./data.json";
import storeDetails from "./store_details.json";

// Custom store icons
import storeIconGreen from '../icon/green.png';
import storeIconYellow from '../icon/yellow.png';
import storeIconRed from '../icon/red.png';

const iconGreen = new L.Icon({
    iconUrl: storeIconGreen,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
});

const iconYellow = new L.Icon({
    iconUrl: storeIconYellow,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
});

const iconRed = new L.Icon({
    iconUrl: storeIconRed,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
});

const HomeNerdlet = () => {
    // State hooks
    const [searchStoreId, setSearchStoreId] = useState("");
    const [selectedType, setSelectedType] = useState("");
    const [selectedStore, setSelectedStore] = useState(null);
    const [hoveredStore, setHoveredStore] = useState(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [results] = useState(storeData.length > 0 ? storeData : []);
    const [filterHealthScore, setFilterHealthScore] = useState("");


    const [storesData, setStoresData] = useState([]);

    const getStoreIcon = (percentage) => {
        if (percentage < 40) return iconRed;
        if (percentage < 80) return iconYellow;
        return iconGreen;
    };

    const calculateStoreUptime = (stores, facetsData) => {
        // Create a map of store numbers to their uptime percentages
        const uptimeMap = {};

        // Group facets by store number and calculate percentages
        facetsData.forEach(facet => {
            const storeNumber = facet.name;

            if (!uptimeMap[storeNumber]) {
                uptimeMap[storeNumber] = {
                    online: 0,
                    offline: 0
                };
            }

            if (facet.online === "Online") {
                uptimeMap[storeNumber].online = facet.results.uniqueCount;
            } else if (facet.offline === "Offline") {
                uptimeMap[storeNumber].offline = facet.results.uniqueCount;
            }
        });

        // Calculate uptime percentage and add to store data
        const updatedStores = stores.map(store => {
            const storeStats = uptimeMap[store.storeNumber];
            let uptimePercentage = 0;

            if (storeStats) {
                const total = storeStats.online + storeStats.offline;
                uptimePercentage = total > 0 ? (storeStats.online / total) * 100 : 0;
            }

            return {
                ...store,
                uptimePercentage: parseFloat(uptimePercentage.toFixed(2)),
                storeIcon: getStoreIcon(parseFloat(uptimePercentage.toFixed(2)))
            };
        });
        return updatedStores;
    };

    useLayoutEffect(() => {
        const updatedData = calculateStoreUptime(storeData, storeDetails.facets);

        console.log(updatedData);
        setStoresData(updatedData);
    }, []);

    const handleMarkerClick = (store) => {
        const dashboardUrl = store.dashboardUrl || `https://newrelic.com/store/${store.storeNumber}`;
        window.open(dashboardUrl, "_blank");
    };

    const handleMouseOver = (store, event) => {
        setHoveredStore(store);
        setMousePosition({ x: event.clientX, y: event.clientY });
    };

    // const handleMouseOut = () => {
    //     setHoveredStore(null);
    // };

    // Filter results
    const filteredResults = results.filter((store) => {
        const matchesId = searchStoreId ? String(store.storeNumber) === String(searchStoreId) : true;
        const matchesType = selectedType ? store.typeCode === selectedType : true;
        const matchesHealth = filterHealthScore ? store.healthScore >= parseInt(filterHealthScore) : true;
        return matchesId && matchesType && matchesHealth;
    });

    const defaultMapCenter = [37.7749, -122.4194];

    return (
        <div className="dashboard-container" style={{ display: "flex", flexDirection: "column" }}>
            {/* Filters */}
            <div className="filters" style={{ display: "flex", padding: "10px", borderBottom: "1px solid #ccc" }}>
                <TextField
                    placeholder="Enter Store ID (e.g., 2221)"
                    onChange={(event) => setSearchStoreId(event.target.value.trim())}
                />
                <Select
                    value={selectedType}
                    onChange={(event, value) => setSelectedType(value)}
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
                    onChange={(event, value) => setFilterHealthScore(value)}
                    placeholder="Filter by Health Score"
                >
                    <SelectItem value="">All Scores</SelectItem>
                    <SelectItem value="80">80 and above</SelectItem>
                    <SelectItem value="50">50 and above</SelectItem>
                    <SelectItem value="30">30 and above</SelectItem>
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
                        {storesData.map((store, i) => {
                            return (
                                <Marker
                                    key={i}
                                    position={[store.postalAddress.latitude, store.postalAddress.longitude]}
                                    icon={store?.storeIcon}
                                    eventHandlers={{
                                        click: () => handleMarkerClick(store),
                                        mouseover: (event) => handleMouseOver(store, event),
                                        // mouseout: () => handleMouseOut(),
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
                                            Upstores Datatime: {store?.uptimePercentage}%
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
                            <p><strong>Customer Footfall:</strong> {selectedStore.customerFootfall || 'N/A'}</p>
                            <p><strong>Response Time:</strong> {selectedStore.details?.performanceStats?.responseTime || 'N/A'} ms</p>
                            <p><strong>Incident Count:</strong> {selectedStore.details?.results?.uniqueCount || 0}</p>
                        </div>
                    ) : (
                        <BlockText>No store selected. Click on a store marker to view details.</BlockText>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HomeNerdlet;