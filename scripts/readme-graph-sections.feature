Feature: kg:processes and kg:files — an instance's README sections drawn from its own declaration

  Background:
    Given a temporary instance "Demo" declaring processes, skills and a test/results directory, with a README asset described "Start here. Then read on."
    And processes Main (calling Sub, with a task bound to skill do-it) and Sub (calling the shared global task GT_Shared bound to skill share-it)
    And two result files under test/results/kg-qa

  @test:scripts/readme-graph-sections.test.ts::entry_process_first,_each_with_its_picture_and_who_starts_it
  Scenario: entry process first, each with its picture and who starts it
    Given the instance with a picture beside each process diagram
    When the processes section is rendered
    Then Main comes before Sub
    And Main is described as the one you start, which calls "Sub"
    And Sub is described as started from "Main"
    And Main's picture processes/main.svg is shown

  @test:scripts/readme-graph-sections.test.ts::a_diagram_with_no_picture_leaves_the_region_untouched,_never_a_broken_image
  Scenario: a diagram with no picture leaves the region untouched, never a broken image
    Given the instance without pictures
    When the processes section is rendered
    Then it is skipped
    And its notes mention render:bpmn

  @test:scripts/readme-graph-sections.test.ts::no_declaration_is_undetermined,_not_'no_Processes'
  Scenario: no declaration is undetermined, not 'no Processes'
    Given an empty directory with no declaration
    Then both the processes section and the files section are skipped

  @test:scripts/readme-graph-sections.test.ts::assets_and_the_declaration_sit_at_the_top
  Scenario: assets and the declaration sit at the top
    When the files section is rendered for the instance with pictures
    Then it has a row for README.md described "Start here."
    And a row for demo.json described "Demo"

  @test:scripts/readme-graph-sections.test.ts::each_file_described_from_itself;_used-by_only_from_a_recorded_relation
  Scenario: each file described from itself; used-by only from a recorded relation
    When the files section is rendered for the instance with pictures
    Then do-it.md is described "Does it." and used by "Main"
    And sub.bpmn is "a Process: Sub" used by "Main"
    And main.bpmn is "a Process: Main" with no user
    And its picture is described as the picture of `main.bpmn`, generated from it

  @test:scripts/readme-graph-sections.test.ts::a_global_task's_Skill_is_used_by_the_processes_that_call_it;_its_file_says_what_it_holds
  Scenario: a global task's Skill is used by the processes that call it; its file says what it holds
    When the files section is rendered for the instance with pictures
    Then share-it.md is described "Shares it." and used by "Sub"
    And global-tasks.bpmn is described as 1 global task, the steps several Processes share

  @test:scripts/readme-graph-sections.test.ts::directory_heading_uses_the_first_sentence_of_its_description
  Scenario: directory heading uses the first sentence of its description
    When the files section is rendered for the instance with pictures
    Then the processes/ directory heading reads "The diagrams."

  @test:scripts/readme-graph-sections.test.ts::a_results_tree_collapses_to_one_row_with_its_count
  Scenario: a results tree collapses to one row with its count
    When the files section is rendered for the instance with pictures
    Then test/results/ is one row reading "2 files, in subdirectories"
    And kg-qa/a.json is not listed

  @test:scripts/readme-graph-sections.test.ts::firstSentence_stops_at_the_first_sentence_and_drops_bold
  Scenario: firstSentence stops at the first sentence and drops bold
    Then the first sentence of "**Bold** start. Second." is "Bold start."
