import numpy as np
import random
import math
import time

# Utility functions
def calculate_distance(point1, point2):
    """Calculate Euclidean distance between two points."""
    return math.sqrt((point1['lat'] - point2['lat'])**2 + 
                     (point1['lng'] - point2['lng'])**2) * 111.32  # Convert to km

def calculate_total_distance(route, points):
    """Calculate total distance of a route."""
    total = 0
    for i in range(len(route) - 1):
        total += calculate_distance(points[route[i]], points[route[i + 1]])
    return total

# Spider Monkey Optimization
class SMO:
    def __init__(self, points, num_monkeys=20, max_iterations=50):
        self.points = points
        self.num_points = len(points)
        self.num_monkeys = num_monkeys
        self.max_iterations = max_iterations
        self.population = []
        self.global_leader = None
        self.local_leaders = []
        self.num_groups = 4
        self.local_limit = 5
        self.global_limit = 10
        
    def initialize(self):
        """Initialize the population with random solutions."""
        self.population = []
        for _ in range(self.num_monkeys):
            # Create random permutation excluding the depot (0)
            perm = list(range(1, self.num_points))
            random.shuffle(perm)
            # Add depot at start and end
            solution = [0] + perm + [0]
            fitness = calculate_total_distance(solution, self.points)
            self.population.append({
                'solution': solution,
                'fitness': fitness,
                'local_limit_count': 0,
                'global_limit_count': 0
            })
        
        # Sort population by fitness
        self.population.sort(key=lambda x: x['fitness'])
        self.global_leader = self.population[0].copy()
        
        # Divide into groups and assign local leaders
        group_size = self.num_monkeys // self.num_groups
        self.local_leaders = []
        for i in range(self.num_groups):
            start_idx = i * group_size
            end_idx = (i + 1) * group_size if i < self.num_groups - 1 else self.num_monkeys
            group = self.population[start_idx:end_idx]
            group.sort(key=lambda x: x['fitness'])
            self.local_leaders.append(group[0].copy())
    
    def local_leader_phase(self):
        """Update positions based on local leader."""
        for i, monkey in enumerate(self.population):
            group_id = min(i // (self.num_monkeys // self.num_groups), self.num_groups - 1)
            local_leader = self.local_leaders[group_id]['solution']
            
            # Create new solution based on local leader
            new_solution = self.create_new_solution(monkey['solution'], local_leader)
            new_fitness = calculate_total_distance(new_solution, self.points)
            
            # Update if better
            if new_fitness < monkey['fitness']:
                self.population[i]['solution'] = new_solution
                self.population[i]['fitness'] = new_fitness
                self.population[i]['local_limit_count'] = 0
            else:
                self.population[i]['local_limit_count'] += 1
    
    def global_leader_phase(self):
        """Update positions based on global leader."""
        for i, monkey in enumerate(self.population):
            if random.random() > 0.5:  # Probability of update
                global_leader = self.global_leader['solution']
                
                # Create new solution based on global leader
                new_solution = self.create_new_solution(monkey['solution'], global_leader)
                new_fitness = calculate_total_distance(new_solution, self.points)
                
                # Update if better
                if new_fitness < monkey['fitness']:
                    self.population[i]['solution'] = new_solution
                    self.population[i]['fitness'] = new_fitness
                    self.population[i]['global_limit_count'] = 0
                else:
                    self.population[i]['global_limit_count'] += 1
    
    def local_leader_decision(self):
        """Update local leaders."""
        for group_id in range(self.num_groups):
            start_idx = group_id * (self.num_monkeys // self.num_groups)
            end_idx = (group_id + 1) * (self.num_monkeys // self.num_groups) if group_id < self.num_groups - 1 else self.num_monkeys
            group = self.population[start_idx:end_idx]
            group.sort(key=lambda x: x['fitness'])
            
            if group[0]['fitness'] < self.local_leaders[group_id]['fitness']:
                self.local_leaders[group_id] = group[0].copy()
                
            # Check if local leader is stuck
            if self.local_leaders[group_id]['local_limit_count'] > self.local_limit:
                self.local_leaders[group_id]['local_limit_count'] = 0
                # Generate a new solution
                perm = list(range(1, self.num_points))
                random.shuffle(perm)
                self.local_leaders[group_id]['solution'] = [0] + perm + [0]
                self.local_leaders[group_id]['fitness'] = calculate_total_distance(
                    self.local_leaders[group_id]['solution'], self.points
                )
    
    def global_leader_decision(self):
        """Update global leader."""
        self.population.sort(key=lambda x: x['fitness'])
        
        if self.population[0]['fitness'] < self.global_leader['fitness']:
            self.global_leader = self.population[0].copy()
            
        # Check if global leader is stuck
        if self.global_leader['global_limit_count'] > self.global_limit:
            self.global_leader['global_limit_count'] = 0
            # Generate a new solution
            perm = list(range(1, self.num_points))
            random.shuffle(perm)
            self.global_leader['solution'] = [0] + perm + [0]
            self.global_leader['fitness'] = calculate_total_distance(
                self.global_leader['solution'], self.points
            )
    
    def create_new_solution(self, current, leader):
        """Create a new solution by using parts of leader solution."""
        # Use ordered crossover (OX) between current solution and leader
        # Exclude depot (first and last positions)
        current_mid = current[1:-1]
        leader_mid = leader[1:-1]
        
        # Choose crossover points
        if len(current_mid) <= 2:
            cx_points = [0, len(current_mid)]
        else:
            cx_points = sorted(random.sample(range(len(current_mid)), 2))
        
        # Create offspring using OX
        offspring = [-1] * len(current_mid)
        
        # Copy the segment between crossover points from current solution
        for i in range(cx_points[0], cx_points[1]):
            if i < len(offspring):
                offspring[i] = current_mid[i]
        
        # Fill the remaining positions from leader
        j = 0
        for i in range(len(offspring)):
            if offspring[i] == -1:
                while j < len(leader_mid) and leader_mid[j] in offspring:
                    j += 1
                if j < len(leader_mid):
                    offspring[i] = leader_mid[j]
                    j += 1
                else:
                    # If we've used all leader points, find an unused point
                    for k in range(1, self.num_points):
                        if k not in offspring:
                            offspring[i] = k
                            break
        
        # Add depot at start and end
        return [0] + offspring + [0]
    
    def run(self):
        """Run the SMO algorithm."""
        self.initialize()
        
        for _ in range(self.max_iterations):
            self.local_leader_phase()
            self.global_leader_phase()
            self.local_leader_decision()
            self.global_leader_decision()
        
        return self.global_leader['solution'], self.global_leader['fitness']

# Ant Colony Optimization
class ACO:
    def __init__(self, points, num_ants=20, alpha=1.0, beta=2.0, evap_rate=0.5, max_iterations=50):
        self.points = points
        self.num_points = len(points)
        self.num_ants = num_ants
        self.alpha = alpha  # Pheromone importance
        self.beta = beta    # Distance importance
        self.evap_rate = evap_rate  # Pheromone evaporation rate
        self.max_iterations = max_iterations
        
        # Initialize distance matrix
        self.distances = np.zeros((self.num_points, self.num_points))
        for i in range(self.num_points):
            for j in range(self.num_points):
                if i != j:
                    self.distances[i][j] = calculate_distance(points[i], points[j])
        
        # Initialize pheromone matrix
        self.pheromones = np.ones((self.num_points, self.num_points))
        
        self.best_solution = None
        self.best_fitness = float('inf')
    
    def construct_solution(self):
        """Construct a solution for an ant."""
        visited = [False] * self.num_points
        visited[0] = True  # Start at depot
        
        solution = [0]
        current = 0
        
        while len(solution) < self.num_points:
            probabilities = []
            
            for j in range(self.num_points):
                if not visited[j]:
                    # Calculate probability based on pheromone and distance
                    pheromone = self.pheromones[current][j] ** self.alpha
                    distance = (1.0 / self.distances[current][j]) ** self.beta if self.distances[current][j] > 0 else 1.0
                    probabilities.append((j, pheromone * distance))
            
            # Roulette wheel selection
            if not probabilities:
                break  # No unvisited nodes left
                
            total = sum(p[1] for p in probabilities)
            if total == 0:
                # Choose randomly if all probabilities are zero
                next_city = random.choice([p[0] for p in probabilities])
            else:
                # Choose based on probability
                r = random.random() * total
                cum_sum = 0
                next_city = probabilities[0][0]  # Default in case of rounding errors
                for city, prob in probabilities:
                    cum_sum += prob
                    if cum_sum >= r:
                        next_city = city
                        break
            
            solution.append(next_city)
            visited[next_city] = True
            current = next_city
            
        # Return to depot
        solution.append(0)
        return solution
    
    def update_pheromones(self, solutions):
        """Update pheromone levels based on solutions."""
        # Evaporation
        self.pheromones *= (1 - self.evap_rate)
        
        # Deposit new pheromones based on solution quality
        for solution, fitness in solutions:
            # Use inverse of fitness (better solutions deposit more pheromone)
            pheromone_deposit = 1.0 / max(0.1, fitness)  # Avoid division by zero
            for i in range(len(solution) - 1):
                self.pheromones[solution[i]][solution[i + 1]] += pheromone_deposit
    
    def local_search(self, solution):
        """Apply 2-opt local search to improve a solution."""
        improved = True
        best_route = solution.copy()
        best_distance = calculate_total_distance(best_route, self.points)
        
        while improved:
            improved = False
            for i in range(1, len(best_route) - 2):
                for j in range(i + 1, len(best_route) - 1):
                    # Skip if indices are adjacent
                    if j - i <= 1:
                        continue
                    
                    # Create new route with 2-opt swap
                    new_route = best_route[:i] + best_route[i:j+1][::-1] + best_route[j+1:]
                    new_distance = calculate_total_distance(new_route, self.points)
                    
                    # Update if better
                    if new_distance < best_distance:
                        best_distance = new_distance
                        best_route = new_route
                        improved = True
                        break
                
                if improved:
                    break
        
        return best_route, best_distance
    
    def run(self):
        """Run the ACO algorithm."""
        for iteration in range(self.max_iterations):
            solutions = []
            
            # Construct solutions for each ant
            for _ in range(self.num_ants):
                solution = self.construct_solution()
                
                # Apply local search to improve solution
                if random.random() < 0.3:  # Apply local search with 30% probability
                    solution, fitness = self.local_search(solution)
                else:
                    fitness = calculate_total_distance(solution, self.points)
                
                solutions.append((solution, fitness))
                
                # Update best solution
                if fitness < self.best_fitness:
                    self.best_solution = solution
                    self.best_fitness = fitness
            
            # Update pheromone levels
            self.update_pheromones(solutions)
            
            # Adaptive parameter adjustment
            if iteration > 0 and iteration % 5 == 0:
                # Gradually increase exploitation over exploration
                self.alpha *= 1.05
                self.beta *= 1.02
                self.alpha = min(3.0, self.alpha)  # Cap at 3.0
                self.beta = min(5.0, self.beta)    # Cap at 5.0
        
        return self.best_solution, self.best_fitness

# Hybrid SMO-ACO algorithm
class HybridSMOACO:
    def __init__(self, points, num_monkeys=20, num_ants=20, max_iterations=25):
        self.points = points
        self.num_points = len(points)
        self.max_iterations = max_iterations
        self.best_solution = None
        self.best_fitness = float('inf')
        
        # Initialize SMO and ACO with parameters
        self.smo = SMO(points, num_monkeys=num_monkeys, max_iterations=max(10, max_iterations//2))
        self.aco = ACO(points, num_ants=num_ants, max_iterations=max(10, max_iterations//2))
    
    def local_search(self, solution):
        """Apply 2-opt local search to improve a solution."""
        improved = True
        best_route = solution.copy()
        best_distance = calculate_total_distance(best_route, self.points)
        
        improvement_count = 0
        max_improvements = 20  # Limit to avoid excessive time in local search
        
        while improved and improvement_count < max_improvements:
            improved = False
            for i in range(1, len(best_route) - 2):
                for j in range(i + 1, len(best_route) - 1):
                    # Skip if indices are adjacent
                    if j - i <= 1:
                        continue
                    
                    # Create new route with 2-opt swap
                    new_route = best_route[:i] + best_route[i:j+1][::-1] + best_route[j+1:]
                    new_distance = calculate_total_distance(new_route, self.points)
                    
                    # Update if better
                    if new_distance < best_distance:
                        best_distance = new_distance
                        best_route = new_route
                        improved = True
                        improvement_count += 1
                        break
                
                if improved:
                    break
        
        return best_route, best_distance
    
    def run(self):
        """Run the hybrid SMO-ACO algorithm with advanced coordination."""
        start_time = time.time()
        
        # Phase 1: Run SMO to get initial solution
        smo_solution, smo_fitness = self.smo.run()
        self.best_solution = smo_solution
        self.best_fitness = smo_fitness
        
        # Apply local search to SMO solution
        improved_smo, improved_fitness = self.local_search(smo_solution)
        if improved_fitness < self.best_fitness:
            self.best_solution = improved_smo
            self.best_fitness = improved_fitness
        
        # Initialize ACO pheromones based on SMO solution quality
        # High quality edges get higher initial pheromone
        edge_frequency = {}
        
        # Count frequency of edges in top SMO solutions
        top_solutions = sorted(self.smo.population, key=lambda x: x['fitness'])[:5]
        for monkey in top_solutions:
            solution = monkey['solution']
            for i in range(len(solution) - 1):
                edge = (solution[i], solution[i + 1])
                edge_frequency[edge] = edge_frequency.get(edge, 0) + 1
        
        # Initialize pheromones with edge frequency information
        max_frequency = max(edge_frequency.values()) if edge_frequency else 1
        for edge, freq in edge_frequency.items():
            # Scale boost based on frequency and solution quality
            boost = (freq / max_frequency) * 3.0 + 1.0
            self.aco.pheromones[edge[0]][edge[1]] *= boost
        
        # Phase 2: Run ACO to refine the solution
        self.aco.best_solution = self.best_solution
        self.aco.best_fitness = self.best_fitness
        aco_solution, aco_fitness = self.aco.run()
        
        # Apply local search to ACO solution
        improved_aco, improved_aco_fitness = self.local_search(aco_solution)
        if improved_aco_fitness < aco_fitness:
            aco_solution = improved_aco
            aco_fitness = improved_aco_fitness
        
        # Return the best solution from both algorithms
        if aco_fitness < self.best_fitness:
            return aco_solution, aco_fitness
        else:
            return self.best_solution, self.best_fitness

# Multiple TSP solver using Cluster-First Route-Second approach
def cluster_and_route(depot, locations, num_salesmen, algorithm='smo-aco'):
    """Solve mTSP by clustering and then routing."""
    # Create complete list of points with depot at index 0
    all_points = [depot] + locations
    
    # If only 1 salesman, solve as a single TSP
    if num_salesmen == 1:
        solution, fitness = solve_single_tsp(all_points, algorithm)
        return [{'salesman': 1, 'route': solution}], fitness
    
    # Try different clustering methods and pick the best
    methods = [
        ('angle', cluster_by_angle),
        ('kmeans', cluster_by_kmeans)
    ]
    
    best_routes = None
    best_distance = float('inf')
    
    for method_name, cluster_function in methods:
        clusters = cluster_function(depot, locations, num_salesmen)
        
        # Step 2: Solve TSP for each cluster
        routes = []
        total_distance = 0
        
        for i, cluster in enumerate(clusters):
            # Skip empty clusters
            if not cluster:
                continue
                
            # Add depot to each cluster
            cluster_points = [depot] + [locations[j] for j in cluster]
            
            # Map original indices
            indices = [0] + [cluster[j] + 1 for j in range(len(cluster))]
            
            # Solve TSP for this cluster
            solution, fitness = solve_single_tsp(cluster_points, algorithm)
            
            # Map solution back to original indices
            mapped_solution = [indices[j] for j in solution]
            
            routes.append({
                'salesman': i + 1,
                'route': mapped_solution
            })
            total_distance += fitness
        
        # Keep the best clustering method
        if total_distance < best_distance:
            best_distance = total_distance
            best_routes = routes
    
    return best_routes, best_distance

def cluster_by_angle(depot, locations, num_clusters):
    """Cluster points based on their angle from the depot."""
    # Calculate angle of each point relative to depot
    angles = []
    for i, point in enumerate(locations):
        dx = point['lng'] - depot['lng']
        dy = point['lat'] - depot['lat']
        angle = math.atan2(dy, dx)
        angles.append((i, angle))
    
    # Sort points by angle
    angles.sort(key=lambda x: x[1])
    
    # Distribute points evenly among clusters
    clusters = [[] for _ in range(num_clusters)]
    for i, (idx, _) in enumerate(angles):
        clusters[i % num_clusters].append(idx)
    
    return clusters

def cluster_by_kmeans(depot, locations, num_clusters):
    """Cluster points using K-means."""
    if not locations:
        return [[] for _ in range(num_clusters)]
    
    # Extract coordinates
    coords = [[loc['lat'], loc['lng']] for loc in locations]
    
    # Simple K-means implementation
    # Initialize centroids randomly
    centroids = []
    for _ in range(num_clusters):
        idx = random.randint(0, len(coords) - 1)
        centroids.append(coords[idx])
    
    # Iterate until convergence or max iterations
    max_iter = 10
    for _ in range(max_iter):
        # Assign points to clusters
        clusters = [[] for _ in range(num_clusters)]
        
        for i, point in enumerate(coords):
            # Find closest centroid
            min_dist = float('inf')
            closest = 0
            
            for j, centroid in enumerate(centroids):
                dist = (point[0] - centroid[0])**2 + (point[1] - centroid[1])**2
                if dist < min_dist:
                    min_dist = dist
                    closest = j
                    
            clusters[closest].append(i)
        
        # Update centroids
        new_centroids = []
        for cluster in clusters:
            if not cluster:  # Empty cluster
                if centroids:
                    new_centroids.append(centroids[0])  # Just use first centroid
                else:
                    new_centroids.append([0, 0])
                continue
                
            # Calculate mean position
            lat_sum = sum(coords[idx][0] for idx in cluster)
            lng_sum = sum(coords[idx][1] for idx in cluster)
            new_centroids.append([lat_sum / len(cluster), lng_sum / len(cluster)])
        
        # Check convergence
        converged = True
        for i in range(len(centroids)):
            if abs(centroids[i][0] - new_centroids[i][0]) > 0.001 or \
               abs(centroids[i][1] - new_centroids[i][1]) > 0.001:
                converged = False
                break
                
        centroids = new_centroids
        
        if converged:
            break
    
    return clusters

def solve_single_tsp(points, algorithm):
    """Solve a single TSP instance using the specified algorithm."""
    if algorithm == 'smo':
        solver = SMO(points)
        solution, fitness = solver.run()
    elif algorithm == 'aco':
        solver = ACO(points)
        solution, fitness = solver.run()
    else:  # 'smo-aco' (hybrid)
        solver = HybridSMOACO(points)
        solution, fitness = solver.run()
    
    return solution, fitness

def solve_mtsp(depot, locations, num_salesmen, algorithm='smo-aco'):
    """Main function to solve mTSP problem."""
    start_time = time.time()
    routes, total_distance = cluster_and_route(depot, locations, num_salesmen, algorithm)
    
    # Return solution in expected format
    return {
        'routes': routes,
        'totalDistance': total_distance,
        'time': time.time() - start_time
    }
