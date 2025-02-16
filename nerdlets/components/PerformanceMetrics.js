import React from 'react';
import { PieChart, Button } from "nr1";

const PerformanceMetrics = ({ selectedStore }) => {

    return (
        <div>
            <div className="metrics-panel" style={{ padding: "10px", borderLeft: "1px solid #ccc", height: "100vh", overflowY: "auto" }}>
                <h2>Performance Metrics</h2>
                {
                    selectedStore?.storeNumber
                        ?
                        <div style={{ display: 'flex', flexDirection: 'column' }}>

                            <PieChart
                                accountIds={[6248776]}
                                query={`FROM StoreVHQDeviceSample SELECT uniqueCount(serialNumber) AS 'POS' WHERE store = ${selectedStore?.storeNumber} FACET store, CASES(WHERE deviceStatus = 'Active' AS 'Online', WHERE deviceStatus = 'Inactive' AS 'Offline') SINCE 1 day ago LIMIT MAX`}
                                fullHeight
                            />
                            <Button onClick={() => {}} style={{ width: "100%", marginTop: '10px' }}>View more details</Button>
                        </div>
                        :
                        <div style={{ height: '70%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <h4>Please select the store</h4>
                        </div>
                }
            </div>
        </div>
    )
}

export default PerformanceMetrics
