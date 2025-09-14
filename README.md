# Journey

A lightweight workflow editor for designing and executing sequential workflows. Built with React, TypeScript, and TailwindCSS.

## Features

### 🎨 Visual Workflow Design

- **Drag & Drop Interface**: Intuitive visual editor for building workflows
- **Block-Based System**: Support for multiple block types including:
  - **PRESENT_CONTENT**: Display content to users
  - **AWAIT_USER_INPUT**: Collect user input
  - **SET_VARIABLE**: Set variable values
  - **UPDATE_VARIABLE**: Update existing variables
  - **IF_ELSE**: Conditional logic
  - **GOTO_NODE**: Navigation between nodes
  - **ANALYZE_RESPONSE**: Response analysis
  - **END_WORKFLOW**: Workflow termination

### 📝 YAML/JSON Support

- **Import/Export**: Full YAML and JSON import/export functionality
- **File Upload**: Drag and drop or browse to import workflow files
- **Paste Support**: Direct YAML pasting for quick imports
- **Real-time Validation**: Instant feedback on workflow structure

### ⚡ Workflow Execution

- **Interactive Runner**: Execute workflows with real-time feedback
- **Variable Tracking**: Monitor variable states during execution
- **User Input Handling**: Seamless input collection during execution
- **Execution Logging**: Detailed logs with timestamps and context

### 🎯 Modern UI/UX

- **Responsive Design**: Works on all screen sizes
- **Dark Mode Support**: Automatic theme switching
- **Fresh Brand Identity**: Modern purple gradient design
- **Accessibility**: Full keyboard navigation and screen reader support

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd workflow-editor
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open your browser to `http://localhost:8080`

## Usage

### Creating a Workflow

1. **Start Fresh**: Click "Create Sample" to begin with a template
2. **Import Existing**: Use "Import" to load a YAML/JSON workflow file
3. **Paste YAML**: Use "Paste YAML" to directly input workflow content

### Editing Workflows

1. **Edit Mode**: Click the "Edit" button to enable editing
2. **Add Nodes**: Click "Add New Node" to create workflow steps
3. **Configure Blocks**: Select blocks to configure their properties
4. **Set Variables**: Use the properties panel to manage workflow variables

### Example YAML Structure

```yaml
id: my-workflow
name: My Workflow
description: A sample workflow
variables:
  - user_name
  - user_age
nodes:
  - id: welcome
    title: Welcome User
    blocks:
      - type: PRESENT_CONTENT
        payload: "Welcome to our workflow!"
      - type: AWAIT_USER_INPUT
        payload: "What's your name?"
        target: user_name
  - id: greeting
    title: Personal Greeting
    blocks:
      - type: PRESENT_CONTENT
        payload: "Hello {user_name}! Nice to meet you."
      - type: END_WORKFLOW
```

### Block Types Reference

#### PRESENT_CONTENT

Displays content to the user.

```yaml
- type: PRESENT_CONTENT
  payload: "Your message here with {variables}"
```

#### AWAIT_USER_INPUT

Waits for user input and stores it in a variable.

```yaml
- type: AWAIT_USER_INPUT
  payload: "Optional prompt text"
  target: variable_name
```

#### SET_VARIABLE

Sets a variable to a specific value.

```yaml
- type: SET_VARIABLE
  target: variable_name
  source: "value or {other_variable}"
```

#### UPDATE_VARIABLE

Updates an existing variable (append or replace).

```yaml
- type: UPDATE_VARIABLE
  target: variable_name
  operation: append
  source: "additional content"
```

#### IF_ELSE

Conditional logic with nested blocks.

```yaml
- type: IF_ELSE
  rules:
    - if: "{variable} == 'value'"
      then:
        - type: GOTO_NODE
          target: success_node
      else:
        - type: GOTO_NODE
          target: failure_node
```

#### GOTO_NODE

Navigate to a specific node.

```yaml
- type: GOTO_NODE
  target: node_id
```

#### ANALYZE_RESPONSE

Analyze user input (simplified implementation).

```yaml
- type: ANALYZE_RESPONSE
  input: "{user_response}"
  output_bool: is_positive
  criteria: sentiment_analysis
```

#### END_WORKFLOW

Terminates the workflow.

```yaml
- type: END_WORKFLOW
```

## Executing Workflows

1. **Open Executor**: Click "Execute" to open the workflow runner
2. **Start Execution**: Click "Start" to begin running the workflow
3. **Provide Input**: Enter responses when prompted
4. **Monitor Progress**: Watch the execution log and variable states
5. **Control Flow**: Use pause/resume/stop controls as needed

## Technical Architecture

### Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: TailwindCSS + shadcn/ui components
- **State Management**: Custom React hooks
- **Routing**: React Router 6
- **YAML Processing**: js-yaml library
- **Build Tool**: Vite

### Key Components

- **WorkflowEditor**: Main editor interface
- **WorkflowNode**: Individual workflow node component
- **WorkflowBlock**: Individual block component
- **WorkflowExecutor**: Workflow execution engine
- **WorkflowCanvas**: Visual connection display
- **YAML Utils**: Import/export functionality

### File Structure

```
src/
├── components/
│   ├── ui/                 # Shared UI components
│   └── workflow/           # Workflow-specific components
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript type definitions
├── utils/                  # Utility functions
└── pages/                  # Application pages
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run typecheck` - Type checking

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For questions or issues, please open a GitHub issue or contact the development team.
