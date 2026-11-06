Feature: the bump classifier behind bootstrap:semver — what each change to a published schema requires

  Background:
    Given a small published-shaped base schema: a closed object with a required non-empty name, an optional kind of a or b, and an optional note
    And each case's bump is classified from the old version to the new, the base being the old version unless stated

  @test:scripts/schema-semver.test.ts::a_field_made_required
  Scenario: a field made required
    Given the base schema with "kind" also made required
    Then the required bump is major

  @test:scripts/schema-semver.test.ts::a_field_removed_from_a_closed_object
  Scenario: a field removed from a closed object
    Given the base schema with the "note" property removed
    Then the required bump is major

  @test:scripts/schema-semver.test.ts::an_enum_narrowed
  Scenario: an enum narrowed
    Given the base schema with kind's enum narrowed from a, b to a
    Then the required bump is major

  @test:scripts/schema-semver.test.ts::a_lower_bound_raised
  Scenario: a lower bound raised
    Given the base schema with name's minLength raised from 1 to 3
    Then the required bump is major

  @test:scripts/schema-semver.test.ts::a_pattern_added
  Scenario: a pattern added
    Given the base schema with a pattern added to note
    Then the required bump is major

  @test:scripts/schema-semver.test.ts::strictness_tightened:_additionalProperties:_false_added
  Scenario: strictness tightened: additionalProperties: false added
    Given the base schema without additionalProperties as the old version, and the base schema as the new
    Then the required bump is major

  @test:scripts/schema-semver.test.ts::a_conditional_added
  Scenario: a conditional added
    Given the base schema with an if/then conditional added
    Then the required bump is major

  @test:scripts/schema-semver.test.ts::the_$id_changed
  Scenario: the $id changed
    Given the base schema with its $id changed to another file
    Then the required bump is major

  @test:scripts/schema-semver.test.ts::a_published_schema_removed
  Scenario: a published schema removed
    Given the base schema as the old version and no new version
    Then the required bump is major

  @test:scripts/schema-semver.test.ts::an_unrecognised_keyword_changed_is_graded_breaking,_not_harmless
  Scenario: an unrecognised keyword changed is graded breaking, not harmless
    Given the base schema with a dependentRequired keyword added to note
    Then the required bump is major

  @test:scripts/schema-semver.test.ts::an_optional_field_added
  Scenario: an optional field added
    Given the base schema with an optional "extra" string property added
    Then the required bump is minor

  @test:scripts/schema-semver.test.ts::a_required_field_relaxed
  Scenario: a required field relaxed
    Given the base schema with no required fields
    Then the required bump is minor

  @test:scripts/schema-semver.test.ts::an_enum_widened
  Scenario: an enum widened
    Given the base schema with "c" added to kind's enum
    Then the required bump is minor

  @test:scripts/schema-semver.test.ts::strictness_relaxed
  Scenario: strictness relaxed
    Given the base schema without additionalProperties false
    Then the required bump is minor

  @test:scripts/schema-semver.test.ts::a_new_schema_published
  Scenario: a new schema published
    Given no old version and the base schema as the new
    Then the required bump is minor

  @test:scripts/schema-semver.test.ts::a_field_added_AND_made_required_is_major,_not_minor
  Scenario: a field added AND made required is major, not minor
    Given the base schema with an "extra" property added and made required
    Then the required bump is major

  @test:scripts/schema-semver.test.ts::a_description_rewritten
  Scenario: a description rewritten
    Given the base schema with a description added to name
    Then the required bump is patch

  @test:scripts/schema-semver.test.ts::a_release_IRI_moving_to_the_next_version_is_not_a_change_to_what_validates
  Scenario: a release IRI moving to the next version is not a change to what validates
    Given the schema with its $id under release 0.1.0 as the old version and under 0.2.0 as the new
    Then the required bump is none

  @test:scripts/schema-semver.test.ts::a_release_IRI_moving_from_the_full_version_to_the_major_(owner,_2026-10-23)_is_not_a_change_either
  Scenario: a release IRI moving from the full version to the major (owner, 2026-10-23) is not a change either
    Given the schema with its $id under 0.1.0 as the old version and under v0 as the new
    Then the required bump is none

  @test:scripts/schema-semver.test.ts::key_order_and_indentation_are_not_a_change
  Scenario: key order and indentation are not a change
    Given the base schema as the old version and its keys reversed, unindented, as the new
    Then the required bump is none

  @test:scripts/schema-semver.test.ts::the_fold_takes_the_highest
  Scenario: the fold takes the highest
    Given the differences from retitling the base schema, plus one extra minor difference
    When the required bump is folded from them
    Then it is minor

  @test:scripts/schema-semver.test.ts::an_unreadable_base
  Scenario: an unreadable base
    Given an old version that could not be read and the base schema as the new
    Then the required bump is could not determine

  @test:scripts/schema-semver.test.ts::a_base_that_does_not_parse
  Scenario: a base that does not parse
    Given an old version that is not valid JSON and the base schema as the new
    Then the required bump is could not determine

  @test:scripts/schema-semver.test.ts::a_head_that_does_not_parse
  Scenario: a head that does not parse
    Given the base schema as the old version and a new version that is not valid JSON
    Then the required bump is could not determine

  @test:scripts/schema-semver.test.ts::a_ref_that_does_not_resolve,_read_through_git
  Scenario: a ref that does not resolve, read through git
    When bootstrap/schemas/graph.schema.json is read through git at a branch that does not exist
    Then the read is reported unreadable
    And classifying it against the current graph schema gives could not determine
