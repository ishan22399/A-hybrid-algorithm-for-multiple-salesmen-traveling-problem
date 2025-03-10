from flask import Flask, jsonify, request, send_from_directory, render_template
import os
import time
import random
from smo_aco import solve_mtsp

app = Flask(__name__, static_folder='.', static_url_path='')

@app.route('/')
def index():
    """Serve the main page of the application."""
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files from the current directory."""
    return send_from_directory('.', path)

@app.route('/solve', methods=['POST'])
def solve():
    """Solve the mTSP problem with the given parameters."""
    try:
        # Get data from the request
        data = request.get_json()
        
        # Extract parameters
        depot = data['depot']  # {lat, lng}
        locations = data['locations']  # [{lat, lng}, ...]
        num_salesmen = data['numSalesmen']
        algorithm = data['algorithm']  # 'smo-aco', 'smo', or 'aco'
        
        # Start timer
        start_time = time.time()
        
        # Solve mTSP
        solution = solve_mtsp(depot, locations, num_salesmen, algorithm)
        
        # Calculate computation time
        computation_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        # Add computation time to the solution
        solution['computationTime'] = computation_time
        
        return jsonify(solution)
    
    except Exception as e:
        print(f"Error solving mTSP: {str(e)}")
        return jsonify({
            'error': str(e),
            'routes': [],
            'totalDistance': 0,
            'computationTime': 0
        }), 500

@app.route('/info', methods=['GET'])
def get_info():
    """Provide information about the algorithms used."""
    return jsonify({
        'algorithms': {
            'smo-aco': {
                'name': 'Spider Monkey - Ant Colony Hybrid',
                'description': 'A hybrid optimization approach that combines the exploration capabilities of Spider Monkey Optimization with the exploitation strengths of Ant Colony Optimization.',
                'parameters': {
                    'iterations': 25,
                    'monkeys': 20,
                    'ants': 20
                }
            },
            'smo': {
                'name': 'Spider Monkey Optimization',
                'description': 'A swarm intelligence algorithm inspired by the fission-fusion social structure of spider monkeys.',
                'parameters': {
                    'iterations': 50,
                    'monkeys': 20
                }
            },
            'aco': {
                'name': 'Ant Colony Optimization',
                'description': 'A probabilistic technique for solving computational problems which can be reduced to finding good paths through graphs.',
                'parameters': {
                    'iterations': 50,
                    'ants': 20,
                    'alpha': 1.0,
                    'beta': 2.0,
                    'evaporation_rate': 0.5
                }
            }
        },
        'project': {
            'name': 'RouteOptima',
            'version': '1.0.0',
            'description': 'A web application for visualizing and solving multiple Traveling Salesman Problems using hybrid optimization algorithms.',
            'authors': [
                'Your Name'
            ],
            'institution': 'Your University/College'
        }
    })

@app.route('/compare', methods=['POST'])
def compare_algorithms():
    """Compare different algorithms on the same problem instance."""
    try:
        # Get data from the request
        data = request.get_json()
        
        # Extract parameters
        depot = data['depot']
        locations = data['locations']
        num_salesmen = data['numSalesmen']
        
        results = {}
        # Run each algorithm and measure performance
        for algorithm in ['smo-aco', 'smo', 'aco']:
            # Start timer
            start_time = time.time()
            
            # Solve with the current algorithm
            solution = solve_mtsp(depot, locations, num_salesmen, algorithm)
            
            # Calculate computation time
            computation_time = (time.time() - start_time) * 1000
            
            # Store the results
            results[algorithm] = {
                'totalDistance': solution['totalDistance'],
                'computationTime': computation_time,
                'routes': solution['routes']
            }
        
        return jsonify(results)
    
    except Exception as e:
        print(f"Error comparing algorithms: {str(e)}")
        return jsonify({
            'error': str(e),
            'results': {}
        }), 500

@app.route('/optimize', methods=['POST'])
def optimize_parameters():
    """Find optimal parameters for the selected algorithm."""
    try:
        # Get data from the request
        data = request.get_json()
        
        # Extract parameters
        depot = data['depot']
        locations = data['locations']
        num_salesmen = data['numSalesmen']
        algorithm = data['algorithm']
        
        # Best parameters will depend on the algorithm
        if algorithm == 'smo':
            best_params = optimize_smo_params(depot, locations, num_salesmen)
        elif algorithm == 'aco':
            best_params = optimize_aco_params(depot, locations, num_salesmen)
        else:  # smo-aco
            best_params = optimize_hybrid_params(depot, locations, num_salesmen)
        
        return jsonify(best_params)
    
    except Exception as e:
        print(f"Error optimizing parameters: {str(e)}")
        return jsonify({
            'error': str(e)
        }), 500

def optimize_smo_params(depot, locations, num_salesmen):
    """Find optimal parameters for SMO."""
    # Simple grid search for demonstration
    best_distance = float('inf')
    best_params = {}
    
    for monkeys in [10, 20, 30]:
        for iterations in [30, 50, 70]:
            # Modify solve_mtsp to use these parameters
            # For now, we'll just call the default implementation
            solution = solve_mtsp(depot, locations, num_salesmen, 'smo')
            
            if solution['totalDistance'] < best_distance:
                best_distance = solution['totalDistance']
                best_params = {
                    'monkeys': monkeys,
                    'iterations': iterations,
                    'totalDistance': best_distance
                }
    
    return best_params

def optimize_aco_params(depot, locations, num_salesmen):
    """Find optimal parameters for ACO."""
    # Simple grid search for demonstration
    best_distance = float('inf')
    best_params = {}
    
    for ants in [10, 20, 30]:
        for alpha in [0.5, 1.0, 1.5]:
            for beta in [1.0, 2.0, 3.0]:
                # Modify solve_mtsp to use these parameters
                # For now, we'll just call the default implementation
                solution = solve_mtsp(depot, locations, num_salesmen, 'aco')
                
                if solution['totalDistance'] < best_distance:
                    best_distance = solution['totalDistance']
                    best_params = {
                        'ants': ants,
                        'alpha': alpha,
                        'beta': beta,
                        'totalDistance': best_distance
                    }
    
    return best_params

def optimize_hybrid_params(depot, locations, num_salesmen):
    """Find optimal parameters for hybrid SMO-ACO."""
    # Simple grid search for demonstration
    best_distance = float('inf')
    best_params = {}
    
    for monkeys in [10, 20]:
        for ants in [10, 20]:
            for iterations in [15, 25]:
                # Modify solve_mtsp to use these parameters
                # For now, we'll just call the default implementation
                solution = solve_mtsp(depot, locations, num_salesmen, 'smo-aco')
                
                if solution['totalDistance'] < best_distance:
                    best_distance = solution['totalDistance']
                    best_params = {
                        'monkeys': monkeys,
                        'ants': ants,
                        'iterations': iterations,
                        'totalDistance': best_distance
                    }
    
    return best_params

@app.route('/report', methods=['POST'])
def generate_report():
    """Generate a detailed report on the solution."""
    try:
        # Get data from the request
        data = request.get_json()
        
        routes = data['routes']
        total_distance = data['totalDistance']
        computation_time = data['computationTime']
        algorithm = data['algorithm']
        
        # Generate report
        report = {
            'summary': {
                'algorithm': algorithm,
                'totalDistance': total_distance,
                'computationTime': computation_time,
                'numAgents': len(routes),
                'totalStops': sum(len(r['route']) for r in routes) - 2 * len(routes)  # Exclude depot visits
            },
            'routeDetails': []
        }
        
        for i, route in enumerate(routes):
            route_details = {
                'agentId': route['salesman'],
                'numStops': len(route['route']) - 2,  # Exclude depot
                'distance': 0,  # Would calculate this if we had the points
                'path': route['route']
            }
            report['routeDetails'].append(route_details)
        
        return jsonify(report)
    
    except Exception as e:
        print(f"Error generating report: {str(e)}")
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/save-solution', methods=['POST'])
def save_solution():
    """Save the current solution to a file."""
    try:
        # Get data from the request
        data = request.get_json()
        
        # Generate a unique filename based on timestamp
        timestamp = int(time.time())
        filename = f"solution_{timestamp}.json"
        
        # Save the data to a file
        file_path = os.path.join(os.path.dirname(__file__), 'solutions', filename)
        
        # Ensure the directory exists
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        with open(file_path, 'w') as f:
            import json
            json.dump(data, f)
        
        return jsonify({
            'success': True,
            'filename': filename,
            'path': file_path
        })
    
    except Exception as e:
        print(f"Error saving solution: {str(e)}")
        return jsonify({
            'error': str(e),
            'success': False
        }), 500

@app.route('/load-solution/<filename>')
def load_solution(filename):
    """Load a previously saved solution."""
    try:
        file_path = os.path.join(os.path.dirname(__file__), 'solutions', filename)
        
        with open(file_path, 'r') as f:
            import json
            data = json.load(f)
        
        return jsonify(data)
    
    except Exception as e:
        print(f"Error loading solution: {str(e)}")
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/list-solutions')
def list_solutions():
    """List all saved solutions."""
    try:
        solutions_dir = os.path.join(os.path.dirname(__file__), 'solutions')
        
        # Ensure the directory exists
        os.makedirs(solutions_dir, exist_ok=True)
        
        files = [f for f in os.listdir(solutions_dir) if f.endswith('.json')]
        
        return jsonify({
            'solutions': files
        })
    
    except Exception as e:
        print(f"Error listing solutions: {str(e)}")
        return jsonify({
            'error': str(e),
            'solutions': []
        }), 500

@app.route('/agent-details/<int:agent_id>', methods=['GET'])
def get_agent_details(agent_id):
    """Get detailed information about a specific agent/salesman."""
    try:
        # Get solution ID from the query parameters if available
        solution_id = request.args.get('solution_id', None)
        solution = None
        
        # If solution_id is provided, load that specific solution
        if solution_id:
            solutions_dir = os.path.join(os.path.dirname(__file__), 'solutions')
            file_path = os.path.join(solutions_dir, f"{solution_id}")
            
            if os.path.exists(file_path):
                with open(file_path, 'r') as f:
                    import json
                    solution = json.load(f)
        
        # If no solution is loaded from file or no solution_id provided,
        # check if there's an active solution in the request data
        if solution is None:
            # Get data from the request body if available
            data = request.get_json(silent=True) or {}
            solution = data.get('solution', {})
            
        # Find the agent's route in the solution
        agent_route = None
        if 'routes' in solution:
            for route in solution['routes']:
                if route.get('salesman') == agent_id:
                    agent_route = route
                    break
        
        if agent_route:
            # Get vehicle type based on agent ID (could be stored in DB in a real app)
            vehicles = {
                1: "Truck",
                2: "Van",
                3: "Scooter",
                4: "Car",
                5: "Motorcycle"
                # More vehicles can be added as needed
            }
            
            vehicle_type = vehicles.get(agent_id, "Vehicle")
            
            # Calculate route statistics
            total_stops = len(agent_route['route']) - 2  # Exclude depot visits
            
            # Calculate distance for this specific route
            distance = agent_route.get('distance', 0)
            
            # Fake orders data (in a real app, this would come from a database)
            orders = []
            for i, location in enumerate(agent_route['route'][1:-1]):  # Skip depot at start and end
                orders.append({
                    'order_id': f"ORD-{agent_id}-{i+1}",
                    'customer': f"Customer {i+1}",
                    'location': location,
                    'items': random.randint(1, 5),
                    'priority': random.choice(['High', 'Medium', 'Low'])
                })
            
            return jsonify({
                'agent': {
                    'id': agent_id,
                    'name': f"Agent {agent_id}",
                    'vehicle': vehicle_type,
                    'status': 'Active',
                    'capacity': 100,
                    'utilization': random.randint(60, 95)
                },
                'route': {
                    'total_stops': total_stops,
                    'total_distance': distance,
                    'estimated_time': round(distance / 40, 2),  # Assuming average speed of 40 units
                    'path': agent_route['route']
                },
                'orders': orders,
                'statistics': {
                    'orders_delivered': len(orders),
                    'on_time_rate': random.randint(80, 100),
                    'efficiency_score': random.randint(75, 98)
                }
            })
        else:
            return jsonify({
                'error': f'No route found for agent {agent_id}'
            }), 404
    
    except Exception as e:
        print(f"Error retrieving agent details: {str(e)}")
        return jsonify({
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print("Starting RouteOptima Server...")
    print("Access the application at http://127.0.0.1:5000/")
    app.run(debug=True)
