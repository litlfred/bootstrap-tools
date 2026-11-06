Feature: check-node-iris — every published file's identifier is its own path under the release address

  Background:
    Given the base "https://example.org/kg/" and the release address "https://example.org/kg/1.2.3/"

  @test:scripts/check-node-iris.test.ts::an_identifier_that_is_its_file's_path_passes;_so_does_the_path_without_its_extension
  Scenario: an identifier that is its file's path passes; so does the path without its extension
    Given a schema whose $id is its own path, a JSON-LD file whose @id is its path without the extension, and one whose @id is its path with a fragment
    When the node identifiers are checked
    Then there are no findings

  @test:scripts/check-node-iris.test.ts::a_slash_vocabulary_names_its_directory:_`processes/ns.jsonld`_may_say_`processes/ns/`_(#1378)
  Scenario: a slash vocabulary names its directory: `processes/ns.jsonld` may say `processes/ns/` (#1378)
    Given processes/ns.jsonld whose @id ends "processes/ns/"
    When the node identifiers are checked
    Then there are no findings
    Given processes/ns.jsonld whose @id ends "processes/other/"
    When the node identifiers are checked
    Then there is 1 finding

  @test:scripts/check-node-iris.test.ts::an_identifier_naming_another_path_fails_—_the_discussion-schema_defect
  Scenario: an identifier naming another path fails — the discussion-schema defect
    Given schemas/discussion.input.schema.json whose $id names skills/discussion/input.schema.json
    When the node identifiers are checked
    Then the one finding says it names `skills/discussion/input.schema.json`, but the file sits at `schemas/discussion.input.schema.json`

  @test:scripts/check-node-iris.test.ts::an_identifier_at_another_release_of_the_same_base_fails;_one_outside_the_base_is_not_this_gate's
  Scenario: an identifier at another release of the same base fails; one outside the base is not this gate's
    Given a.json with an $id under release 0.9.0 of the base
    And b.json with an $id on another host
    When the node identifiers are checked
    Then only a.json is reported

  @test:scripts/check-node-iris.test.ts::a_full_version_of_the_declared_major_is_another_release:_it_FAILS_(the_bootstrap-tools#39_tolerance_is_gone)
  Scenario: a full version of the declared major is another release: it FAILS (the bootstrap-tools#39 tolerance is gone)
    Given the release addresses for version "1.4.0", whose agent address is the base followed by "v1/"
    And a schema whose $id is under "1.2.3/"
    When the node identifiers are checked against that release
    Then the schema is reported

  @test:scripts/check-node-iris.test.ts::only_a_document's_own_top-level_identifier_counts
  Scenario: only a document's own top-level identifier counts
    Then an object whose $id is only nested has no own identifier
    And an array holding an object with @id has no own identifier
    And an object with a top-level @id "x" has the own identifier "x"
