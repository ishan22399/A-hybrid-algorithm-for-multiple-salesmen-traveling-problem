// Global variables
let map;
let markers = [];
let routes = [];
let depotMarker;
let isSimulating = false;
let simulationInterval;
let simulationStep = 0;
let simulationSpeed = 1;
let activeAgents = [];
let cityCoordinates = {
    bangalore: { lat: 12.9716, lng: 77.5946, zoom: 12 },
    mumbai: { lat: 19.0760, lng: 72.8777, zoom: 12 },
    delhi: { lat: 28.7041, lng: 77.1025, zoom: 12 },
    hyderabad: { lat: 17.3850, lng: 78.4867, zoom: 12 },
    chennai: { lat: 13.0827, lng: 80.2707, zoom: 12 }
};
const mapTileStyles = {
    standard: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    dark: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
    light: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png'
};
const deliveryAgentTypes = [
    { type: 'bike', icon: 'motorcycle', name: 'Bike Courier' },
    { type: 'scooter', icon: 'bicycle', name: 'Scooter' },
    { type: 'car', icon: 'car', name: 'Car Delivery' }
];
const colors = [
    '#4361ee', '#3a0ca3', '#7209b7', '#f72585', '#4cc9f0',
    '#ff9e00', '#38b000', '#ff006e', '#fb5607', '#8338ec'
];
const customerNames = [
    'Emma Johnson', 'Liam Smith', 'Olivia Brown', 'Noah Garcia', 'Ava Martinez',
    'Ethan Davis', 'Sophia Wilson', 'Mason Taylor', 'Isabella Anderson', 'Logan Thomas',
    'Mia Rodriguez', 'Jacob Martinez', 'Charlotte Lewis', 'Elijah Lee', 'Amelia Walker',
    'Benjamin Hall', 'Abigail Allen', 'James Young', 'Emily King', 'Alexander Wright'
];
const foodItems = [
    'Margherita Pizza', 'Chicken Biryani', 'Butter Chicken', 'Vegetable Fried Rice', 
    'Hakka Noodles', 'Paneer Tikka', 'Veg Burger', 'Chicken Burger', 'French Fries', 
    'Ice Cream', 'Cold Coffee', 'Masala Dosa', 'Idli Sambhar', 'Chole Bhature',
    'Pav Bhaji', 'Veg Pulao', 'Tandoori Chicken', 'Palak Paneer', 'Dal Makhani', 
    'Malai Kofta', 'Veg Thali', 'Non-Veg Thali', 'Masala Chai'
];

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    setupEventListeners();
    generateRandomLocations();
    updateAgentsLegend();
});

// Enhanced map initialization with touch support for mobile
function initializeMap() {
    const city = document.getElementById('city').value;
    const coords = cityCoordinates[city];
    
    // Initialize the map with tap and touch support enabled
    map = L.map('visualization-map', {
        center: [coords.lat, coords.lng],
        zoom: coords.zoom,
        tap: true,
        dragging: true,
        touchZoom: true
    });
    
    L.tileLayer(mapTileStyles.standard, {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    // Add zoom control with improved positioning
    map.zoomControl.setPosition('bottomright');
    
    // Add scale control
    L.control.scale({
        imperial: false,
        position: 'bottomleft'
    }).addTo(map);
    
    // Monitor window resize events to keep the map responsive
    window.addEventListener('resize', function() {
        setTimeout(() => map.invalidateSize(), 100);
    });
}

// Set up all event listeners
function setupEventListeners() {
    document.getElementById('generateBtn').addEventListener('click', generateRandomLocations);
    document.getElementById('solveButton').addEventListener('click', solveMTSP);
    document.getElementById('clearBtn').addEventListener('click', clearMap);
    document.getElementById('play-pause-btn').addEventListener('click', toggleSimulation);
    document.getElementById('restart-btn').addEventListener('click', restartSimulation);
    document.getElementById('simulation-timeline').addEventListener('input', updateSimulationFromTimeline);
    document.getElementById('simulation-speed').addEventListener('change', updateSimulationSpeed);
    
    // Close modal when clicking the close button or outside the modal
    document.querySelectorAll('.close-modal').forEach(element => {
        element.addEventListener('click', () => {
            document.getElementById('order-modal').style.display = 'none';
        });
    });
    
    window.addEventListener('click', (event) => {
        if (event.target === document.getElementById('order-modal')) {
            document.getElementById('order-modal').style.display = 'none';
        }
    });
    
    // Add resizable functionality to details panel with improved UX
    setupEnhancedResizablePanel();
    
    // Add map resize functionality
    setupMapResizing();
}

// Change number of agents
function changeAgents(delta) {
    const input = document.getElementById('numSalesmen');
    const newValue = parseInt(input.value) + delta;
    if (newValue >= parseInt(input.min) && newValue <= parseInt(input.max)) {
        input.value = newValue;
        updateAgentsLegend();
    }
}

// Change number of locations
function changeLocations(delta) {
    const input = document.getElementById('numLocations');
    const newValue = parseInt(input.value) + delta;
    if (newValue >= parseInt(input.min) && newValue <= parseInt(input.max)) {
        input.value = newValue;
    }
}

// Change the current city
function changeCity() {
    const city = document.getElementById('city').value;
    document.getElementById('city-title').textContent = `${capitalizeFirstLetter(city)} Route Optimization`;
    
    const coords = cityCoordinates[city];
    map.setView([coords.lat, coords.lng], coords.zoom);
    
    // Clear and regenerate
    clearMap();
    generateRandomLocations();
}

// Capitalize first letter of a string
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Generate random locations on the map
function generateRandomLocations() {
    clearMap();
    
    const numLocations = parseInt(document.getElementById('numLocations').value);
    const city = document.getElementById('city').value;
    const coords = cityCoordinates[city];
    
    // Create a depot/hub
    const hubLatLng = [coords.lat, coords.lng];
    const hubIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="legend-icon hub"><i class="fas fa-warehouse"></i></div>`,
        iconSize: [30, 30]
    });
    
    depotMarker = L.marker(hubLatLng, { icon: hubIcon }).addTo(map);
    depotMarker.bindPopup(`
        <h3>Distribution Center</h3>
        <p><strong>Location:</strong> ${capitalizeFirstLetter(city)}</p>
        <p><strong>Coordinates:</strong> ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}</p>
    `);
    
    // Generate random delivery locations around the center
    const bounds = map.getBounds();
    const latSpread = Math.abs(bounds.getNorth() - bounds.getSouth()) * 0.8;
    const lngSpread = Math.abs(bounds.getEast() - bounds.getWest()) * 0.8;
    
    for (let i = 0; i < numLocations; i++) {
        // Create random coordinates within the visible map area
        const lat = coords.lat + (Math.random() * latSpread - latSpread/2);
        const lng = coords.lng + (Math.random() * lngSpread - lngSpread/2);
        
        // Generate random customer data
        const customer = customerNames[Math.floor(Math.random() * customerNames.length)];
        const order = foodItems[Math.floor(Math.random() * foodItems.length)];
        const orderTime = getRandomOrderTime();
        
        const locationIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div class="legend-icon location"><i class="fas fa-house-user"></i></div>`,
            iconSize: [30, 30]
        });
        
        const marker = L.marker([lat, lng], { icon: locationIcon }).addTo(map);
        
        // Store customer data with the marker
        marker.customerData = {
            id: i + 1,
            name: customer,
            order: order,
            orderTime: orderTime,
            lat: lat,
            lng: lng
        };
        
        marker.bindPopup(`
            <h3>Order #${i+1}</h3>
            <p><strong>Customer:</strong> ${customer}</p>
            <p><strong>Order:</strong> ${order}</p>
            <p><strong>Time:</strong> ${orderTime}</p>
            <button class="view-details-btn" onclick="showOrderDetails(${i})">View Details</button>
        `);
        
        marker.on('click', function() {
            // Update the details panel
            document.getElementById('route-details-content').innerHTML = `
                <div class="order-info">
                    <p><strong>Order #${i+1}:</strong> ${order}</p>
                    <p><strong>Customer:</strong> ${customer}</p>
                    <p><strong>Ordered at:</strong> ${orderTime}</p>
                    <p><strong>Location:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
                </div>
            `;
        });
        
        markers.push(marker);
    }
    
    // Update the statistics
    document.getElementById('locationsPerAgent').textContent = 
        Math.floor(numLocations / parseInt(document.getElementById('numSalesmen').value));
        
    // Fit map to markers
    if (markers.length > 0) {
        const group = new L.featureGroup([depotMarker, ...markers]);
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

// Get random order time
function getRandomOrderTime() {
    const hour = Math.floor(Math.random() * 12) + 1;
    const minute = Math.floor(Math.random() * 60);
    const ampm = Math.random() > 0.5 ? 'AM' : 'PM';
    return `${hour}:${minute.toString().padStart(2, '0')} ${ampm}`;
}

// Show detailed order information in a modal
function showOrderDetails(index) {
    const marker = markers[index];
    const data = marker.customerData;
    
    document.getElementById('order-details').innerHTML = `
        <div class="order-detail-card">
            <div class="order-header">
                <h3>Order #${data.id}</h3>
                <span class="order-status">In Delivery</span>
            </div>
            <div class="customer-info">
                <div class="info-item">
                    <i class="fas fa-user"></i>
                    <div>
                        <strong>Customer Name</strong>
                        <p>${data.name}</p>
                    </div>
                </div>
                <div class="info-item">
                    <i class="fas fa-utensils"></i>
                    <div>
                        <strong>Order Item</strong>
                        <p>${data.order}</p>
                    </div>
                </div>
                <div class="info-item">
                    <i class="fas fa-clock"></i>
                    <div>
                        <strong>Order Time</strong>
                        <p>${data.orderTime}</p>
                    </div>
                </div>
                <div class="info-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <div>
                        <strong>Location</strong>
                        <p>Latitude: ${data.lat.toFixed(4)}</p>
                        <p>Longitude: ${data.lng.toFixed(4)}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('order-modal').style.display = 'block';
}

// Solve the mTSP problem
function solveMTSP() {
    if (markers.length === 0) {
        alert('Please generate locations first!');
        return;
    }
    
    // Show loading spinner - using explicit display style
    const loadingElement = document.getElementById('loading');
    loadingElement.classList.remove('hidden');
    loadingElement.style.display = 'flex';
    
    // Clear previous routes
    clearRoutes();
    
    // Get parameters
    const numSalesmen = parseInt(document.getElementById('numSalesmen').value);
    const algorithm = document.getElementById('algorithm').value;
    const depot = depotMarker.getLatLng();
    
    // Prepare locations data
    const locations = markers.map(marker => {
        const latLng = marker.getLatLng();
        return {lat: latLng.lat, lng: latLng.lng};
    });
    
    // Mock the backend response for testing - comment this out when backend is ready
    setTimeout(() => {
        const mockResponse = generateMockResponse(numSalesmen, locations, depot);
        processSolutionData(mockResponse);
    }, 1000);
    
    /* Uncomment when backend is ready
    // Send data to backend
    fetch('/solve', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            depot: {lat: depot.lat, lng: depot.lng},
            locations: locations,
            numSalesmen: numSalesmen,
            algorithm: algorithm
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        processSolutionData(data);
    })
    .catch(error => {
        // Force hide loading spinner with both class and inline style
        const loadingElement = document.getElementById('loading');
        loadingElement.classList.add('hidden');
        loadingElement.style.display = 'none';
        
        console.error('Error:', error);
        alert('An error occurred while solving the problem.');
    });
    */
}

// Separate function to process solution data
function processSolutionData(data) {
    // Force hide loading spinner with both class and inline style
    const loadingElement = document.getElementById('loading');
    loadingElement.classList.add('hidden');
    loadingElement.style.display = 'none';
    
    // Update statistics
    document.getElementById('totalDistance').textContent = `${data.totalDistance.toFixed(2)} km`;
    document.getElementById('computationTime').textContent = `${data.computationTime.toFixed(2)} ms`;
    
    // Draw routes on the map
    const depot = depotMarker.getLatLng();
    drawRoutes(data.routes, depot);
    
    // Reset and prepare simulation
    resetSimulation();
    prepareSimulation(data.routes);
}

// Generate mock response for testing without backend
function generateMockResponse(numSalesmen, locations, depot) {
    // Simple clustering of locations for multiple salesmen
    const routes = [];
    const locationsPerAgent = Math.ceil(locations.length / numSalesmen);
    
    for (let i = 0; i < numSalesmen; i++) {
        const start = i * locationsPerAgent;
        const end = Math.min((i + 1) * locationsPerAgent, locations.length);
        if (start >= locations.length) break;
        
        const route = [0]; // Start at depot
        // Add location indices (+1 because depot is 0)
        for (let j = start; j < end; j++) {
            route.push(j + 1);
        }
        route.push(0); // Return to depot
        
        routes.push({
            salesman: i + 1,
            route: route
        });
    }
    
    // Calculate mock total distance
    let totalDistance = 0;
    for (const route of routes) {
        let routeDistance = 0;
        for (let i = 0; i < route.route.length - 1; i++) {
            const fromIdx = route.route[i];
            const toIdx = route.route[i + 1];
            const from = fromIdx === 0 ? depot : locations[fromIdx - 1];
            const to = toIdx === 0 ? depot : locations[toIdx - 1];
            
            // Simple Euclidean distance
            const dx = from.lng - to.lng;
            const dy = from.lat - to.lat;
            routeDistance += Math.sqrt(dx * dx + dy * dy) * 111.32; // Scale to km
        }
        totalDistance += routeDistance;
    }
    
    return {
        routes: routes,
        totalDistance: totalDistance,
        computationTime: Math.random() * 1000 // Random computation time
    };
}

// Draw routes on the map
function drawRoutes(routesData, depot) {
    activeAgents = [];
    
    routesData.forEach((route, index) => {
        const color = colors[index % colors.length];
        const routePoints = route.route.map(locIndex => {
            if (locIndex === 0) {
                return [depot.lat, depot.lng];
            } else {
                const marker = markers[locIndex - 1];
                return [marker.getLatLng().lat, marker.getLatLng().lng];
            }
        });
        
        // Create polyline for the route
        const polyline = L.polyline(routePoints, {
            color: color,
            weight: 4,
            opacity: 0.7,
            dashArray: '10, 10'
        }).addTo(map);
        
        // Choose agent type randomly
        const agentType = deliveryAgentTypes[Math.floor(Math.random() * deliveryAgentTypes.length)];
        
        // Add animated marker to show movement along the route
        const agentIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div class="agent-icon" style="background-color: ${color}"><i class="fas fa-${agentType.icon}"></i></div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });
        
        const agentMarker = L.marker(routePoints[0], {icon: agentIcon}).addTo(map);
        
        // Create agent data
        const agentData = {
            id: route.salesman,
            type: agentType.type,
            name: `Agent ${route.salesman}`,
            color: color,
            icon: agentType.icon,
            route: routePoints,
            orders: route.route.filter(id => id !== 0).length,
            marker: agentMarker,
            currentPos: 0
        };
        
        agentMarker.bindPopup(`
            <div class="agent-popup">
                <h3 style="color:${color}">Agent ${route.salesman}</h3>
                <p><strong>Vehicle:</strong> ${agentType.name}</p>
                <p><strong>Orders:</strong> ${agentData.orders}</p>
                <button onclick="showAgentDetails(${route.salesman-1})" class="view-details-btn">View Details</button>
            </div>
        `);
        
        agentMarker.on('click', () => {
            showAgentDetails(route.salesman-1);
        });
        
        activeAgents.push(agentData);
        routes.push({polyline, agentMarker});
    });
    
    // Update the legend with agent colors and icons
    updateAgentsLegend(routesData.map((r, i) => ({
        id: r.salesman,
        color: colors[i % colors.length],
        icon: activeAgents[i].icon
    })));
    
    // Show details for the first agent by default when routes are drawn
    if (activeAgents.length > 0) {
        showAgentDetails(0);
    }
    
    // Also update the route details immediately
    updateRouteDetails(routesData);
}

// Enhanced agent details display
function showAgentDetails(agentIndex) {
    if (!activeAgents[agentIndex]) return;
    
    const agent = activeAgents[agentIndex];
    const agentType = deliveryAgentTypes.find(t => t.type === agent.type) || { name: 'Delivery Agent' };
    
    // Calculate current location information
    let currentLocation = "Starting at depot";
    if (agent.currentPos > 0 && agent.currentPos < agent.route.length - 1) {
        // Get position in original route array to find correct index in markers array
        const routeData = activeAgents[agentIndex].route[agent.currentPos];
        // Check if it's a depot location
        const isDepot = (routeData[0] === agent.route[0][0] && routeData[1] === agent.route[0][1]);
        currentLocation = isDepot ? "At depot" : `Delivery location ${agent.currentPos}`;
    } else if (agent.currentPos === agent.route.length - 1) {
        currentLocation = "Returned to depot";
    }
    
    // Calculate progress percentage
    const progressPercent = ((agent.currentPos / (agent.route.length - 1)) * 100).toFixed(0);
    const deliverySpeed = Math.round((simulationSpeed * 30)); // Showing km/h for visual effect
    
    const agentDetailsHtml = `
        <div class="agent-detail-card">
            <div class="agent-header" style="background-color: ${agent.color}">
                <i class="fas fa-${agent.icon}"></i>
                <h4>${agent.name}</h4>
            </div>
            <div class="agent-info">
                <div class="info-row">
                    <span>Vehicle Type:</span>
                    <span>${agentType.name}</span>
                </div>
                <div class="info-row">
                    <span>Total Orders:</span>
                    <span>${agent.orders}</span>
                </div>
                <div class="info-row">
                    <span>Current Location:</span>
                    <span class="status">${currentLocation}</span>
                </div>
                <div class="info-row">
                    <span>Status:</span>
                    <span class="status active">Active</span>
                </div>
                <div class="info-row">
                    <span>Speed:</span>
                    <span>${deliverySpeed} km/h</span>
                </div>
                <div class="info-row">
                    <span>Progress:</span>
                    <span>${progressPercent}%</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-bar">
                        <div class="progress" style="width: ${progressPercent}%; background-color: ${agent.color}"></div>
                    </div>
                </div>
                <div class="info-row">
                    <span>Completed Deliveries:</span>
                    <span>${Math.min(agent.currentPos, agent.orders)}</span>
                </div>
                <div class="info-row">
                    <span>Remaining Deliveries:</span>
                    <span>${Math.max(0, agent.orders - agent.currentPos)}</span>
                </div>
                <div class="info-row">
                    <span>Est. Time Remaining:</span>
                    <span>${Math.round((agent.route.length - 1 - agent.currentPos) / simulationSpeed)} sec</span>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('agent-details-content').innerHTML = agentDetailsHtml;
    
    // Scroll to top of container after updating content
    const agentContent = document.getElementById('agent-details-content');
    agentContent.scrollTop = 0;
    
    // Ensure the details panel is visible
    const detailsPanel = document.getElementById('details-panel');
    detailsPanel.style.display = 'flex';
}

// Update route details in the panel
function updateRouteDetails(routesData) {
    let totalOrders = 0;
    let totalPoints = 0;
    let totalAgents = routesData.length;
    
    routesData.forEach(route => {
        totalOrders += route.route.filter(id => id !== 0).length;
        totalPoints += route.route.length;
    });
    
    const routeDetailsHtml = `
        <div class="route-summary">
            <div class="summary-item">
                <div class="summary-icon"><i class="fas fa-users"></i></div>
                <div class="summary-text">
                    <div class="summary-value">${totalAgents}</div>
                    <div class="summary-label">Delivery Agents</div>
                </div>
            </div>
            <div class="summary-item">
                <div class="summary-icon"><i class="fas fa-box"></i></div>
                <div class="summary-text">
                    <div class="summary-value">${totalOrders}</div>
                    <div class="summary-label">Orders</div>
                </div>
            </div>
            <div class="summary-item">
                <div class="summary-icon"><i class="fas fa-map-signs"></i></div>
                <div class="summary-text">
                    <div class="summary-value">${totalPoints}</div>
                    <div class="summary-label">Route Points</div>
                </div>
            </div>
            <div class="summary-item">
                <div class="summary-icon"><i class="fas fa-calculator"></i></div>
                <div class="summary-text">
                    <div class="summary-value">${(totalOrders/totalAgents).toFixed(1)}</div>
                    <div class="summary-label">Orders per Agent</div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('route-details-content').innerHTML = routeDetailsHtml;
    
    // Scroll to top of container after updating content
    const routeContent = document.getElementById('route-details-content');
    routeContent.scrollTop = 0;
    
    // Ensure the details panel is visible
    const detailsPanel = document.getElementById('details-panel');
    detailsPanel.style.display = 'flex';
}

// Simulation functions
function resetSimulation() {
    if (simulationInterval) {
        clearInterval(simulationInterval);
    }
    simulationStep = 0;
    isSimulating = false;
    document.getElementById('simulation-timeline').value = 0;
    document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-play"></i>';
    
    // Reset agents to starting positions
    if (activeAgents.length > 0) {
        activeAgents.forEach(agent => {
            agent.currentPos = 0;
            agent.marker.setLatLng(agent.route[0]);
        });
        // Update agent details if any is displayed
        updateCurrentAgentDetails();
    }
}

function prepareSimulation(routesData) {
    // Reset agents to starting positions and ensure route is properly set
    activeAgents.forEach(agent => {
        agent.currentPos = 0;
        if (agent.route && agent.route.length > 0) {
            agent.marker.setLatLng(agent.route[0]);
        }
    });
    
    // Select first agent to show details by default
    if (activeAgents.length > 0) {
        showAgentDetails(0);
    }
}

function toggleSimulation() {
    if (!activeAgents.length) {
        alert('Please solve the routes first!');
        return;
    }
    
    isSimulating = !isSimulating;
    
    if (isSimulating) {
        document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-pause"></i>';
        simulationInterval = setInterval(updateSimulation, 1000 / simulationSpeed);
    } else {
        document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-play"></i>';
        clearInterval(simulationInterval);
    }
}

function restartSimulation() {
    resetSimulation();
    prepareSimulation();
    
    // Auto-start the simulation
    if (activeAgents.length > 0) {
        isSimulating = true;
        document.getElementById('play-pause-btn').innerHTML = '<i class="fas fa-pause"></i>';
        simulationInterval = setInterval(updateSimulation, 1000 / simulationSpeed);
    }
}

function updateSimulation() {
    let allAgentsFinished = true;
    
    activeAgents.forEach(agent => {
        if (agent.currentPos < agent.route.length - 1) {
            allAgentsFinished = false;
            agent.currentPos++;
            const position = agent.route[agent.currentPos];
            agent.marker.setLatLng(position);
            
            // Add pulse effect to marker when reaching a delivery location
            if (agent.currentPos > 0 && agent.currentPos < agent.route.length - 1) {
                // Only add effect for locations, not for depot
                if (agent.route[agent.currentPos][0] !== agent.route[0][0] || 
                    agent.route[agent.currentPos][1] !== agent.route[0][1]) {
                    addPulseEffect(agent);
                }
            }
            
            // Update agent popup if open
            if (agent.marker.isPopupOpen()) {
                agent.marker.getPopup().setContent(`
                    <div class="agent-popup">
                        <h3 style="color:${agent.color}">Agent ${agent.id}</h3>
                        <p><strong>Vehicle:</strong> ${getAgentVehicle(agent)}</p>
                        <p><strong>Orders:</strong> ${agent.orders}</p>
                        <p><strong>Progress:</strong> ${Math.round((agent.currentPos / (agent.route.length - 1)) * 100)}%</p>
                        <button onclick="showAgentDetails(${agent.id - 1})" class="view-details-btn">View Details</button>
                    </div>
                `);
            }
        }
    });
    
    // Update timeline slider
    const maxSteps = Math.max(...activeAgents.map(a => a.route.length - 1));
    const maxProgress = activeAgents.reduce((max, agent) => Math.max(max, agent.currentPos), 0);
    document.getElementById('simulation-timeline').value = (maxProgress / maxSteps) * 100;
    
    // Update currently displayed agent details
    updateCurrentAgentDetails();
    
    if (allAgentsFinished) {
        // When all agents finished, loop by restarting the simulation
        activeAgents.forEach(agent => {
            agent.currentPos = 0;
            agent.marker.setLatLng(agent.route[0]);
        });
        
        // Update the display
        updateCurrentAgentDetails();
    }
    
    // If map size changes during simulation, redraw it
    map.invalidateSize();
}

// Function to add pulse effect to markers
function addPulseEffect(agent) {
    // Create a temporary circle marker at the current location
    const pulseMarker = L.circleMarker(agent.marker.getLatLng(), {
        radius: 10,
        color: agent.color,
        fillColor: agent.color,
        fillOpacity: 0.5,
        weight: 2,
        opacity: 0.8
    }).addTo(map);
    
    // Animate the pulse effect
    let size = 10;
    let opacity = 0.5;
    
    const pulseAnimation = setInterval(() => {
        size += 2;
        opacity -= 0.05;
        
        if (size >= 30) {
            clearInterval(pulseAnimation);
            map.removeLayer(pulseMarker);
        } else {
            pulseMarker.setStyle({
                radius: size,
                fillOpacity: opacity,
                opacity: opacity
            });
        }
    }, 50);
}

// Helper function to get agent's vehicle name
function getAgentVehicle(agent) {
    const agentType = deliveryAgentTypes.find(t => t.type === agent.type);
    return agentType ? agentType.name : 'Delivery Agent';
}

// Update details for the currently displayed agent
function updateCurrentAgentDetails() {
    if (document.getElementById('agent-details-content').innerHTML.includes('agent-detail-card')) {
        // Find which agent is currently shown
        const agentIdMatch = document.getElementById('agent-details-content').innerHTML.match(/Agent (\d+)/);
        if (agentIdMatch && agentIdMatch[1]) {
            const agentId = parseInt(agentIdMatch[1]);
            showAgentDetails(agentId - 1);
        }
    }
}

function updateSimulationFromTimeline() {
    const value = parseInt(document.getElementById('simulation-timeline').value);
    const maxSteps = Math.max(...activeAgents.map(a => a.route.length - 1));
    const step = Math.floor((value / 100) * maxSteps);
    
    activeAgents.forEach(agent => {
        const pos = Math.min(step, agent.route.length - 1);
        agent.currentPos = pos;
        agent.marker.setLatLng(agent.route[pos]);
    });
    
    // Update agent details
    updateCurrentAgentDetails();
}

function updateSimulationSpeed() {
    simulationSpeed = parseFloat(document.getElementById('simulation-speed').value);
    
    if (isSimulating) {
        clearInterval(simulationInterval);
        simulationInterval = setInterval(updateSimulation, 1000 / simulationSpeed);
    }
}

// Clear routes from the map
function clearRoutes() {
    routes.forEach(route => {
        map.removeLayer(route.polyline);
        map.removeLayer(route.agentMarker);
    });
    routes = [];
    activeAgents = [];
    resetSimulation();
}

// Clear everything from the map
function clearMap() {
    // Clear markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    // Clear depot
    if (depotMarker) map.removeLayer(depotMarker);
    depotMarker = null;
    
    // Clear routes
    clearRoutes();
    
    // Reset statistics
    document.getElementById('totalDistance').textContent = '0 km';
    document.getElementById('computationTime').textContent = '0 ms';
    document.getElementById('locationsPerAgent').textContent = '0';
    
    // Reset agent and route details
    document.getElementById('agent-details-content').innerHTML = '<p>Select an agent on the map to view details</p>';
    document.getElementById('route-details-content').innerHTML = '';
    
    // Ensure loading spinner is hidden
    const loadingElement = document.getElementById('loading');
    loadingElement.classList.add('hidden');
    loadingElement.style.display = 'none';
}

// Update the agents legend
function updateAgentsLegend(agents = []) {
    const legendContainer = document.getElementById('agents-legend');
    legendContainer.innerHTML = '';
    
    if (agents.length > 0) {
        agents.forEach(agent => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `
                <div class="legend-icon" style="background-color: ${agent.color}">
                    <i class="fas fa-${agent.icon}"></i>
                </div>
                <div class="legend-text">Agent ${agent.id}</div>
            `;
            legendContainer.appendChild(legendItem);
        });
    } else {
        const numAgents = parseInt(document.getElementById('numSalesmen').value);
        
        for (let i = 0; i < numAgents; i++) {
            const color = colors[i % colors.length];
            const agentIcon = deliveryAgentTypes[i % deliveryAgentTypes.length].icon;
            
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            legendItem.innerHTML = `
                <div class="legend-icon" style="background-color: ${color}">
                    <i class="fas fa-${agentIcon}"></i>
                </div>
                <div class="legend-text">Agent ${i+1}</div>
            `;
            legendContainer.appendChild(legendItem);
        }
    }
}

// Make the details panel resizable with improved UX
function setupEnhancedResizablePanel() {
    const detailsPanel = document.getElementById('details-panel');
    const mapContainer = document.getElementById('map-container');
    const resizeHandle = document.getElementById('resize-handle');
    const agentContent = document.getElementById('agent-details-content');
    const routeContent = document.getElementById('route-details-content');
    
    let isResizing = false;
    let startY, startHeight, startMapHeight;
    
    // Handle mouse events for resize
    resizeHandle.addEventListener('mousedown', function(e) {
        isResizing = true;
        startY = e.clientY;
        startHeight = detailsPanel.offsetHeight;
        startMapHeight = mapContainer.offsetHeight;
        
        resizeHandle.classList.add('dragging');
        document.body.style.cursor = 'ns-resize';
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isResizing) return;
        
        const deltaY = startY - e.clientY;
        const newPanelHeight = Math.max(200, Math.min(startHeight + deltaY, window.innerHeight * 0.7));
        const newMapHeight = startMapHeight - deltaY;
        
        detailsPanel.style.height = newPanelHeight + 'px';
        mapContainer.style.height = newMapHeight + 'px';
        
        // Force a redraw of the map to prevent visual glitches
        if (map) {
            map.invalidateSize();
        }
        
        e.preventDefault();
    });
    
    document.addEventListener('mouseup', function() {
        if (isResizing) {
            isResizing = false;
            resizeHandle.classList.remove('dragging');
            document.body.style.cursor = '';
            
            // Update the map size
            if (map) {
                map.invalidateSize();
            }
            
            // Update details content after resizing
            updateContentAfterResize();
        }
    });
    
    // Handle touch events for mobile devices
    resizeHandle.addEventListener('touchstart', function(e) {
        isResizing = true;
        startY = e.touches[0].clientY;
        startHeight = detailsPanel.offsetHeight;
        startMapHeight = mapContainer.offsetHeight;
        
        resizeHandle.classList.add('dragging');
        e.preventDefault();
    });
    
    document.addEventListener('touchmove', function(e) {
        if (!isResizing) return;
        
        const deltaY = startY - e.touches[0].clientY;
        const newPanelHeight = Math.max(200, Math.min(startHeight + deltaY, window.innerHeight * 0.7));
        const newMapHeight = startMapHeight - deltaY;
        
        detailsPanel.style.height = newPanelHeight + 'px';
        mapContainer.style.height = newMapHeight + 'px';
        
        // Force a redraw of the map to prevent visual glitches
        if (map) {
            map.invalidateSize();
        }
        
        e.preventDefault();
    });
    
    document.addEventListener('touchend', function() {
        if (isResizing) {
            isResizing = false;
            resizeHandle.classList.remove('dragging');
            
            // Update the map size
            if (map) {
                map.invalidateSize();
            }
            
            // Update details content after resizing
            updateContentAfterResize();
        }
    });
    
    // Double click to toggle panel size
    resizeHandle.addEventListener('dblclick', function() {
        const defaultHeight = window.innerHeight * 0.3; // 30% of viewport height
        const expandedHeight = window.innerHeight * 0.5; // 50% of viewport height
        const currentHeight = detailsPanel.offsetHeight;
        const currentMapHeight = mapContainer.offsetHeight;
        
        // If closer to default height, expand. If expanded, collapse.
        const targetHeight = (currentHeight < (defaultHeight + 50)) ? expandedHeight : defaultHeight;
        const heightDiff = targetHeight - currentHeight;
        
        detailsPanel.style.height = targetHeight + 'px';
        mapContainer.style.height = (currentMapHeight - heightDiff) + 'px';
        
        // Force a redraw of the map
        if (map) {
            map.invalidateSize();
        }
        
        updateContentAfterResize();
    });
}

// Update content after resize to ensure proper display
function updateContentAfterResize() {
    // Redraw agent details and route summary if available
    if (activeAgents && activeAgents.length > 0) {
        // Find which agent is currently shown
        const agentIdMatch = document.getElementById('agent-details-content').innerHTML.match(/Agent (\d+)/);
        if (agentIdMatch && agentIdMatch[1]) {
            const agentId = parseInt(agentIdMatch[1]);
            showAgentDetails(agentId - 1);
        }
        
        // Update route details
        updateRouteDetails(activeAgents.map(a => ({ 
            salesman: a.id,
            route: a.route.map((_, i) => i === 0 || i === a.route.length - 1 ? 0 : i)
        })));
    }
}

// Add a keyboard shortcut to toggle the details panel
document.addEventListener('keydown', function(e) {
    // Alt+D to toggle details panel visibility
    if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        const detailsPanel = document.getElementById('details-panel');
        const mapContainer = document.getElementById('map-container');
        
        if (detailsPanel.style.display === 'none' || detailsPanel.offsetHeight < 50) {
            // Show details panel
            detailsPanel.style.display = 'flex';
            detailsPanel.style.height = '30vh';
            mapContainer.style.height = 'calc(70vh - 70px)';
        } else {
            // Hide details panel
            const currentPanelHeight = detailsPanel.offsetHeight;
            detailsPanel.style.display = 'none';
            mapContainer.style.height = `calc(${mapContainer.offsetHeight}px + ${currentPanelHeight}px)`;
        }
        
        // Force a redraw of the map
        if (map) {
            setTimeout(() => map.invalidateSize(), 100);
        }
    }
});

// Setup map resizing functionality
function setupMapResizing() {
    const mapContainer = document.getElementById('map-container');
    const detailsPanel = document.getElementById('details-panel');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const resetSizeBtn = document.getElementById('reset-size-btn');
    
    // Initialize with default sizes
    const defaultMapHeight = 'calc(70vh - 70px)';
    const defaultPanelHeight = '30vh';
    
    // Handle fullscreen toggle
    fullscreenBtn.addEventListener('click', function() {
        document.body.classList.toggle('map-fullscreen');
        
        if (document.body.classList.contains('map-fullscreen')) {
            fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
            fullscreenBtn.title = "Exit fullscreen";
        } else {
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            fullscreenBtn.title = "Toggle fullscreen";
        }
        
        // Force map to redraw after size change
        setTimeout(() => {
            if (map) map.invalidateSize();
        }, 300);
    });
    
    // Reset map to default size
    resetSizeBtn.addEventListener('click', function() {
        // Only reset if not in fullscreen mode
        if (!document.body.classList.contains('map-fullscreen')) {
            mapContainer.style.height = defaultMapHeight;
            detailsPanel.style.height = defaultPanelHeight;
            
            // Force map to redraw after size change
            if (map) map.invalidateSize();
        }
    });
    
    // Monitor resize events and update map
    let resizeTimeout;
    const resizeObserver = new ResizeObserver(entries => {
        // Debounce the resize events
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (map) map.invalidateSize();
            
            // If map container is resized manually, adjust details panel accordingly
            if (!document.body.classList.contains('map-fullscreen')) {
                const mainElement = document.querySelector('main');
                const mainHeight = mainElement.offsetHeight;
                const mapHeight = mapContainer.offsetHeight;
                const topBarHeight = document.querySelector('.top-bar').offsetHeight;
                
                // Calculate remaining space for details panel
                const remainingHeight = mainHeight - mapHeight - topBarHeight;
                if (remainingHeight > 100) { // Minimum reasonable height
                    detailsPanel.style.height = `${remainingHeight}px`;
                }
            }
        }, 100);
    });
    
    // Start observing size changes
    resizeObserver.observe(mapContainer);
    
    // Add keyboard shortcut for fullscreen (F key)
    document.addEventListener('keydown', function(e) {
        if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
            // Trigger fullscreen toggle
            fullscreenBtn.click();
        }
    });
    
    // Handle ESC key to exit fullscreen
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.body.classList.contains('map-fullscreen')) {
            document.body.classList.remove('map-fullscreen');
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            fullscreenBtn.title = "Toggle fullscreen";
            
            // Force map to redraw after size change
            setTimeout(() => {
                if (map) map.invalidateSize();
            }, 300);
        }
    });
}
