Feature: kg:toc — a README's own headings, as GitHub anchors them

  @test:scripts/readme-toc.test.ts::level_2_with_level_3_nested;_level_1_and_4_left_out
  Scenario: level 2 with level 3 nested; level 1 and 4 left out
    Given markdown with a level-1 title, level-2 "One" and "Two", a level-3 "One, part A" and a level-4 heading
    When its table of contents is made
    Then it lists One with One, part A nested beneath it, then Two
    And the level-1 and level-4 headings are left out

  @test:scripts/readme-toc.test.ts::a_`#`_line_inside_fenced_code_is_not_a_heading
  Scenario: a `#` line inside fenced code is not a heading
    Given markdown with a heading "Real" and heading-like lines inside backtick and tilde fences
    When its headings are read
    Then the only heading is "Real"

  @test:scripts/readme-toc.test.ts::duplicates_get_GitHub's_-1,_-2,_counted_over_headings_of_every_level
  Scenario: duplicates get GitHub's -1, -2, counted over headings of every level
    Given markdown with a level-1 "Notes" and two level-2 "Notes"
    When its table of contents is made
    Then the two entries link to "#notes-1" and "#notes-2"

  @test:scripts/readme-toc.test.ts::links,_code_and_emphasis_are_dropped_from_the_text_and_the_anchor
  Scenario: links, code and emphasis are dropped from the text and the anchor
    Given a heading holding a link around code and an emphasised word
    When its table of contents is made
    Then the entry reads "The kg:files section" and links to "#the-kgfiles-section"

  @test:scripts/readme-toc.test.ts::its_own_region_is_skipped,_so_a_second_run_changes_nothing
  Scenario: its own region is skipped, so a second run changes nothing
    Given a README with an empty kg:toc region and headings A and B
    When the table of contents is rendered and injected, and then rendered and injected again
    Then the first result lists A and B
    And the second result is identical to the first

  @test:scripts/readme-toc.test.ts::no_README_anywhere_is_could-not-determine,_never_an_empty_list
  Scenario: no README anywhere is could-not-determine, never an empty list
    When the table of contents is rendered for a root that does not exist and no README
    Then it is skipped
