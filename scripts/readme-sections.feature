Feature: README sections, written standalone, and where a bootstrap term link points

  @test:scripts/readme-sections.test.ts::only_between_a_section's_own_markers,_in_the_harness's_form
  Scenario: only between a section's own markers, in the harness's form
    Given a README with text before and after a kg:files begin/end region holding "old"
    When "new body" is injected into the kg:files section
    Then only the region changes, now holding the new body set off by blank lines

  @test:scripts/readme-sections.test.ts::a_README_that_has_not_opted_in_is_left_exactly_as_it_is
  Scenario: a README that has not opted in is left exactly as it is
    Given a README with no markers
    When a body is injected into the kg:files section
    Then the README is unchanged

  @test:scripts/readme-sections.test.ts::sibling_clones:_the_tools'_README_links_the_published_page
  Scenario: sibling clones: the tools' README links the published page
    Given bootstrap and bootstrap-tools as two sibling git repositories
    When the term link for Process is computed from the tools' scripts directory
    Then it is "https://litlfred.github.io/bootstrap/schemas/#process"

  @test:scripts/readme-sections.test.ts::one_repository_holding_both:_still_the_published_page,_never_a_sibling-relative_path
  Scenario: one repository holding both: still the published page, never a sibling-relative path
    Given bootstrap and bootstrap-tools inside one git repository
    When the term link for Process is computed from the tools' scripts directory
    Then it is "https://litlfred.github.io/bootstrap/schemas/#process"

  @test:scripts/readme-sections.test.ts::the_tools_alone,_with_no_bootstrap_anywhere:_the_same_published_page
  Scenario: the tools alone, with no bootstrap anywhere: the same published page
    Given bootstrap-tools in a git repository with no bootstrap
    When the term link for Process is computed from the tools' scripts directory
    Then it is "https://litlfred.github.io/bootstrap/schemas/#process"

  @test:scripts/readme-sections.test.ts::bootstrap's_own_README,_in_its_own_repository,_links_relatively
  Scenario: bootstrap's own README, in its own repository, links relatively
    Given bootstrap and bootstrap-tools as two sibling git repositories
    When the term link for Process is computed from bootstrap's root
    Then it is "schemas/README.md#process"
    When it is computed from bootstrap's schemas directory
    Then it is "README.md#process"
