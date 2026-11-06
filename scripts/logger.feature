Feature: bootstrap's logger contract, held to what can be checked from bootstrap's own files

  Background:
    Given bootstrap checked out beside the tools

  @test:scripts/logger.test.ts::the_Logger's_contract_names_exactly_the_five_fields_log-message_requires,_and_its_optional_body
  Scenario: the Logger's contract names exactly the five fields log-message requires, and its optional body
    Given the fields table of skills/log-message.md and responsibility 1 of skills/logger.md
    Then the logger contract names the five fields log-message requires
    And those are exactly the table's required fields: timestamp, actor, process, task and message
    And the table's only optional field is body
    And the logger contract mentions `body` when given

  @test:scripts/logger.test.ts::one_lane_in_log-message_names_the_logger_role,_and_it_holds_activities_only_—_no_gateway,_so_it_decides_nothing
  Scenario: one lane in log-message names the logger role, and it holds activities only — no gateway, so it decides nothing
    Given the parsed processes/log-message.bpmn
    Then exactly one lane names the logger role
    And that lane holds at least one flow node
    And every flow node it holds is a kind of task

  @test:scripts/logger.test.ts::a_message_reaches_the_Logger_only_on_the_branch_where_all_five_fields_are_present
  Scenario: a message reaches the Logger only on the branch where all five fields are present
    Given the sequence flows that enter the logger lane from outside it
    Then there is at least one
    And each comes from an exclusive gateway whose name says all five are present
    And each such flow is named "yes"

  @test:scripts/logger.test.ts::the_incomplete_branch_ends_outside_the_Logger's_lane,_saying_so
  Scenario: the incomplete branch ends outside the Logger's lane, saying so
    Then exactly one sequence flow is named "no"
    And it ends at an end event
    And that end event is not in the logger lane
