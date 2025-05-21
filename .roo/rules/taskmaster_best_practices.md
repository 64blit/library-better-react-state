# Taskmaster Best Practices

## Task Continuity and State Management

When working with Taskmaster for project management:

1. **Verify task structure before each session**
   - Begin by running `get_tasks` with `withSubtasks: true` to understand the current task structure
   - Don't assume the task structure remains unchanged between sessions
   - Check for task/subtask IDs before attempting status changes

2. **Use proper subtask referencing**
   - Reference subtasks using dot notation (e.g., "1.2" for the second subtask of task 1)
   - When a subtask operation fails, verify the subtask exists and check its ID format
   - If uncertain, use `get_task` to confirm the exact ID before other operations

3. **Handle task structure changes gracefully**
   - If tasks.json appears to have been reset or modified:
      - Use `expand_task` to regenerate subtasks with appropriate complexity
      - Update new subtasks to reflect work already completed
      - Avoid multiple calls to `parse_prd` or `initialize_project` which may reset tasks
   
4. **Record implementation progress incrementally**
   - Update subtask details regularly using `update_subtask` to record progress
   - Set status to "in-progress" when starting work, then "done" when complete
   - Include file paths and key implementation details in updates

5. **Keep task structure and code in sync**
   - When implementing code, align file/class structure with task organization
   - Reference task IDs in code comments for traceability
   - Update task details with actual implementation choices when they diverge from initial plans

By following these practices, you'll maintain continuity in task management even when tasks.json changes unexpectedly, and ensure that task status accurately reflects implementation progress. 
