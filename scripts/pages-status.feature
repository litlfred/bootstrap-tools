Feature: pages-status — the push's status and its message

  Background:
    Given a git-initialised instance "demo" at version 1.0.0 with iriBase "https://x.example/demo/", a README, one schema and one skill

  @test:scripts/pages-status.test.ts::the_publication_root_is_--url,_else_iriBase,_else_the_Pages_address
  Scenario: the publication root is --url, else iriBase, else the Pages address
    Then an iriBase without a trailing slash and no --url gives that iriBase with a trailing slash
    And a --url given beside an iriBase wins, with a trailing slash
    And a repository "Owner/repo" alone gives "https://owner.github.io/repo/"
    And nothing gives no root

  @test:scripts/pages-status.test.ts::a_failure_outranks_an_unknown,_and_an_unknown_is_never_a_pass
  Scenario: a failure outranks an unknown, and an unknown is never a pass
    Then two done steps are pushed
    And done with could-not-determine is could-not-determine
    And could-not-determine with not-done is not-pushed

  @test:scripts/pages-status.test.ts::every_address_answering_is_pushed,_and_the_message_names_the_commit_and_the_QA
  Scenario: every address answering is pushed, and the message names the commit and the QA
    When the status is taken for commit "1a2b3c4d5e" with every address answering 200
    Then the status is pushed, to target github-pages
    And the documents QA is 1 answering of 1, none missing or unchecked
    And the message starts "pushed 1a2b3c4 to https://x.example/demo/ — QA: staged ok"

  @test:scripts/pages-status.test.ts::a_root_that_answers_over_a_README.html_that_does_not_is_not_pushed
  Scenario: a root that answers over a README.html that does not is not pushed
    When the status is taken with every address answering 200 except README.html, which answers 404
    Then the status is not-pushed
    And the README QA is not-done with HTTP 404
    And the message contains "README.html 404"

  @test:scripts/pages-status.test.ts::a_document_answering_404_is_not_pushed;_a_403_could_not_be_determined
  Scenario: a document answering 404 is not pushed; a 403 could not be determined
    When the status is taken with every .json address answering 404
    Then the status is not-pushed, and the message names the schema's address as missing
    When the status is taken with every address answering 403
    Then the status is could-not-determine

  @test:scripts/pages-status.test.ts::a_subgraph_list_renders_only_those_directories_and_the_root's_files;_an_unknown_id_is_a_problem
  Scenario: a subgraph list renders only those directories and the root's files; an unknown id is a problem
    When the subgraphs "skills" and "nope" are selected
    Then "nope" is unknown
    And README.md and skills/s.md are kept, but schemas/a.schema.json is not
    When the site is staged with only the "skills" subgraph
    Then there are no problems, skills/s.md is staged and the schema is not
    When the status is taken for the subgraph "nope" with every address answering 200
    Then the status is not-pushed and the message mentions "--subgraph nope"
