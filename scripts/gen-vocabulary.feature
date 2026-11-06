Feature: bootstrap's vocabulary is exactly its terms (owner, 2026-09-30)

  Background:
    Given the vocabulary generated for bootstrap's release

  @test:scripts/gen-vocabulary.test.ts::every_defined_term,_in_order,_then_every_graph_typology_—_and_nothing_else
  Scenario: every defined term, in order, then every graph typology — and nothing else
    Then its @graph ids are every term as "bootstrap:<term>" in declared order, followed by every graph typology as "bootstrap:graphTypology/<kind>", and nothing else

  @test:scripts/gen-vocabulary.test.ts::names_nothing_above_bootstrap
  Scenario: names nothing above bootstrap
    Then the serialised vocabulary contains neither "folio-assistant" nor "cat-harness"

  @test:scripts/gen-vocabulary.test.ts::its_@id_is_the_slash_namespace_itself,_so_each_term_is_a_path_below_it
  Scenario: its @id is the slash namespace itself, so each term is a path below it
    Then its @id is bootstrap's agent release address followed by "ns/"
    And its context's "bootstrap" prefix is that same @id

  @test:scripts/gen-vocabulary.test.ts::the_committed_file_is_current
  Scenario: the committed file is current
    Then the committed bootstrap/ns.jsonld equals the generated vocabulary, pretty-printed with a trailing newline

  @test:scripts/gen-vocabulary.test.ts::labels_read_as_words
  Scenario: labels read as words
    Then the label of "NodeSchema" is "Node Schema"
    And the label of "KnowledgeGraph" is "Knowledge Graph"
