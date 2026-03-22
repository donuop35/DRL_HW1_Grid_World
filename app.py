from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/evaluate_policy', methods=['POST'])
def evaluate_policy():
    data = request.json
    n = data.get('n', 5)
    start_id = data.get('start_id')
    end_id = data.get('end_id')
    obstacles = set(data.get('obstacles', []))
    policy_data = data.get('policy', {})  # 接收前端產生的 Policy
    gamma = 0.9
    theta = 1e-4

    if start_id is None or end_id is None:
        return jsonify({'error': 'Missing start_id or end_id'}), 400

    start_id = int(start_id)
    end_id = int(end_id)
    obstacles = set(map(int, obstacles))

    # Initialize Value function
    V = {i: 0.0 for i in range(n * n)}

    def get_row_col(state):
        return state // n, state % n

    def get_state(row, col):
        if 0 <= row < n and 0 <= col < n:
            return row * n + col
        return -1

    # Action mapping
    action_map = {
        '↑': (-1, 0),
        '↓': (1, 0),
        '←': (0, -1),
        '→': (0, 1)
    }

    # We only update non-terminal and non-obstacle states
    states_to_update = [i for i in range(n * n) if i != end_id and i not in obstacles]

    iterations = 0
    while True:
        delta = 0
        new_V = V.copy()

        for s in states_to_update:
            r, c = get_row_col(s)
            v_s = 0

            # Determine policy for this state
            str_s = str(s)
            s_policy = policy_data.get(str_s, 'ALL')
            
            if s_policy == 'ALL':
                actions_to_take = list(action_map.values())
                prob = 0.25
            elif s_policy in action_map:
                actions_to_take = [action_map[s_policy]]
                prob = 1.0
            else:
                actions_to_take = list(action_map.values())
                prob = 0.25

            for dr, dc in actions_to_take:
                nr, nc = r + dr, c + dc
                ns = get_state(nr, nc)

                # Environment Dynamics definition
                if ns == -1 or ns in obstacles:
                    reward = -1
                    next_s = s  # Bounce back to original state
                elif ns == end_id:
                    reward = 1
                    next_s = ns # Terminal state
                else:
                    reward = 0
                    next_s = ns # Normal move

                # Bellman Equation update
                v_s += prob * (reward + gamma * V[next_s])

            new_V[s] = v_s
            delta = max(delta, abs(v_s - V[s]))

        V = new_V
        iterations += 1
        if delta < theta:
            break

    # Format output (rounded to 3 decimal places for precision)
    results = {str(k): round(v, 3) for k, v in V.items()}

    return jsonify({
        'status': 'success',
        'iterations': iterations,
        'values': results
    })

@app.route('/value_iteration', methods=['POST'])
def value_iteration():
    data = request.json
    n = data.get('n', 5)
    start_id = data.get('start_id')
    end_id = data.get('end_id')
    obstacles = set(data.get('obstacles', []))
    gamma = 0.9
    theta = 1e-4

    if start_id is None or end_id is None:
        return jsonify({'error': 'Missing start_id or end_id'}), 400

    start_id = int(start_id)
    end_id = int(end_id)
    obstacles = set(map(int, obstacles))

    # Initialize Value function
    V = {i: 0.0 for i in range(n * n)}

    def get_row_col(state):
        return state // n, state % n

    def get_state(row, col):
        if 0 <= row < n and 0 <= col < n:
            return row * n + col
        return -1

    action_map = {
        '↑': (-1, 0),
        '↓': (1, 0),
        '←': (0, -1),
        '→': (0, 1)
    }

    # We only update non-terminal and non-obstacle states
    states_to_update = [i for i in range(n * n) if i != end_id and i not in obstacles]

    iterations = 0
    while True:
        delta = 0
        new_V = V.copy()

        for s in states_to_update:
            r, c = get_row_col(s)
            
            # Value Iteration uses max_a [ R + gamma * V(s') ]
            max_v = float('-inf')

            for action_name, (dr, dc) in action_map.items():
                nr, nc = r + dr, c + dc
                ns = get_state(nr, nc)

                # Environment Dynamics definition
                if ns == -1 or ns in obstacles:
                    reward = -1
                    next_s = s  # Bounce back to original state
                elif ns == end_id:
                    reward = 1
                    next_s = ns # Terminal state
                else:
                    reward = 0
                    next_s = ns # Normal move

                q_value = reward + gamma * V[next_s]
                if q_value > max_v:
                    max_v = q_value

            new_V[s] = max_v
            delta = max(delta, abs(max_v - V[s]))

        V = new_V
        iterations += 1
        if delta < theta:
            break

    # After convergence, derive optimal policy pi*(s) greedily
    optimal_policy = {}
    for s in states_to_update:
        r, c = get_row_col(s)
        max_v = float('-inf')
        best_actions = []

        for action_name, (dr, dc) in action_map.items():
            nr, nc = r + dr, c + dc
            ns = get_state(nr, nc)

            if ns == -1 or ns in obstacles:
                reward = -1
                next_s = s
            elif ns == end_id:
                reward = 1
                next_s = ns
            else:
                reward = 0
                next_s = ns

            q_value = reward + gamma * V[next_s]
            
            # Allow tiny floating point differences
            if q_value > max_v + 1e-6:
                max_v = q_value
                best_actions = [action_name]
            elif abs(q_value - max_v) <= 1e-6:
                best_actions.append(action_name)

        # For display, represent ties if any exist (though typical gridworld we can just pick one)
        # We will just pick the first best action if there's a tie, to keep visualization clean
        # or combine them if needed. For simplicity, we just take the first one.
        import random
        optimal_policy[str(s)] = random.choice(best_actions)

    results = {str(k): round(v, 3) for k, v in V.items()}

    return jsonify({
        'status': 'success',
        'iterations': iterations,
        'values': results,
        'policy': optimal_policy
    })

if __name__ == '__main__':
    app.run(debug=True)
