import { Workflow } from "@/types/workflow";
import * as yaml from "js-yaml";

export const parseYamlWorkflow = (yamlContent: string): Workflow => {
  try {
    const parsed = yaml.load(yamlContent) as any;

    // Validate and transform the parsed YAML into our Workflow type
    const workflow: Workflow = {
      id: parsed.id || "untitled-workflow",
      name: parsed.name || "Untitled Workflow",
      description: parsed.description || "",
      variables: parsed.variables || [],
      nodes:
        parsed.nodes?.map((node: any) => ({
          id: node.id,
          title: node.title,
          blocks:
            node.blocks?.map((block: any) => ({
              type: block.type,
              payload: block.payload,
              target: block.target,
              prompt: block.prompt,
              operation: block.operation,
              source: block.source,
              input: block.input,
              output_bool: block.output_bool,
              criteria: block.criteria,
              rules: block.rules,
              then: block.then,
              else: block.else,
              action: block.action,
              actionArgs: block.actionArgs,
            })) || [],
        })) || [],
    };

    return workflow;
  } catch (error) {
    console.error("Error parsing YAML:", error);
    throw new Error(
      "Failed to parse workflow YAML: " + (error as Error).message,
    );
  }
};

export const exportWorkflowToYaml = (workflow: Workflow): string => {
  try {
    // Clean up the workflow object for export
    const cleanWorkflow = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      variables: workflow.variables,
      nodes: workflow.nodes.map((node) => ({
        id: node.id,
        title: node.title,
        blocks: node.blocks.map((block) => {
          const cleanBlock: any = { type: block.type };
          if (block.payload) cleanBlock.payload = block.payload;
          if (block.target) cleanBlock.target = block.target;
          if (block.prompt) cleanBlock.prompt = block.prompt;
          if (block.operation) cleanBlock.operation = block.operation;
          if (block.source) cleanBlock.source = block.source;
          if (block.input) cleanBlock.input = block.input;
          if (block.output_bool) cleanBlock.output_bool = block.output_bool;
          if (block.criteria) cleanBlock.criteria = block.criteria;
          if (block.rules) cleanBlock.rules = block.rules;
          if (block.then) cleanBlock.then = block.then;
          if (block.else) cleanBlock.else = block.else;
          if (block.action) cleanBlock.action = block.action;
          if (block.actionArgs) cleanBlock.actionArgs = block.actionArgs;
          return cleanBlock;
        }),
      })),
    };

    return yaml.dump(cleanWorkflow, {
      indent: 2,
      flowLevel: -1,
      noRefs: true,
      sortKeys: false
    });
  } catch (error) {
    console.error("Error exporting YAML:", error);
    throw new Error(
      "Failed to export workflow to YAML: " + (error as Error).message,
    );
  }
};

export const createSampleWorkflow = (): Workflow => ({
  id: "core-transformation-v7",
  name: "Core Transformation Workflow",
  description:
    "An interactive script based on the Core Transformation process.",
  variables: [],
  nodes: [
    {
      id: "Ask for FBoT",
      title: "Ask for FBoT",
      blocks: [
        {
          type: "PRESENT_CONTENT",
          payload:
            "What is your feeling, behavior or thought (FBoT) that you'd like to work with?",
        },
        {
          type: "AWAIT_USER_INPUT",
          target: "FBoT",
        },
      ],
    },
    {
      id: "Ask for Context",
      title: "Ask for Context",
      blocks: [
        {
          type: "PRESENT_CONTENT",
          payload: "Where, when and with whom do you have This {FBoT}?",
        },
        {
          type: "AWAIT_USER_INPUT",
          target: "Context",
        },
      ],
    },
    {
      id: "Connect With Part",
      title: "Connect With Part",
      blocks: [
        {
          type: "PRESENT_CONTENT",
          payload:
            "Take a moment to relax and turn inward… Think about a specific time that {FBoT} occurred… Mentally step into the situation, seeing what you saw, hearing what you heard, feeling what you felt at the time… As you relive this experience, notice any internal images, sounds, or feelings… Since you didn't consciously generate {FBoT}, it's as if some part of you generated it.",
        },
      ],
    },
    {
      id: "End Process",
      title: "End Process",
      blocks: [
        {
          type: "SET_VARIABLE",
          target: "Core State",
          source: "last_item_in({Outcome Chain})",
        },
        {
          type: "PRESENT_CONTENT",
          payload:
            "Now that this part is filled with {Core State} as a way of being... [Phase 2 begins]",
        },
        {
          type: "END_WORKFLOW",
        },
      ],
    },
  ],
});
