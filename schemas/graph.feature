Feature: bootstrap defines its own terms, and nothing in it points above it

  Background:
    Given bootstrap checked out beside the tools, with its README, its generated schemas and its declaration bootstrap.json

  @test:schemas/graph.test.ts::no_definition_names_anything_above_bootstrap
  Scenario: no definition names anything above bootstrap
    When every term definition in BOOTSTRAP_TERMS is matched against the names of things above bootstrap
    Then no definition matches any of them

  @test:schemas/graph.test.ts::the_generated_schema_carries_every_term_as_a_definition
  Scenario: the generated schema carries every term as a definition
    Given bootstrap/schemas/graph.schema.json
    Then its $defs hold exactly the keys of BOOTSTRAP_TERMS
    And each $defs entry's description is that term's definition

  @test:schemas/graph.test.ts::${key}_uses_no_later_term_and_not_itself
  Scenario: ${key} uses no later term and not itself
    Given each term in its declared order, one test per term
    When the terms its definition's text uses are found, longest name first, singular or plural, as whole words
    Then none of them is the term itself or a term declared after it

  @test:schemas/graph.test.ts::the_authored_uses_lists_keep_the_declared_order_(checkDeclaredOrder)
  Scenario: the authored uses lists keep the declared order (checkDeclaredOrder)
    Given each term with its authored uses list from BOOTSTRAP_TERM_USES, in declared order
    When checkDeclaredOrder runs over them
    Then it reports no problems

  @test:schemas/graph.test.ts::each_authored_uses_list_names_exactly_the_terms_its_definition's_text_uses
  Scenario: each authored uses list names exactly the terms its definition's text uses
    When each term's authored uses list is compared with the terms its definition's text uses
    Then no term has a term in one set but not the other

  @test:schemas/graph.test.ts::checkDeclaredOrder_names_a_forward,_a_self_and_a_missing_use
  Scenario: checkDeclaredOrder names a forward, a self and a missing use
    Given step "a" needing "b", and step "b" needing "b" and "z"
    When checkDeclaredOrder runs over them
    Then it reports "a" uses "b" as forward
    And "b" uses "b" as self
    And "b" uses "z" as missing

  @test:schemas/graph.test.ts::every_term_names_the_schema_that_defines_it
  Scenario: every term names the schema that defines it
    Then every term's BOOTSTRAP_TERM_DEFINED_BY entry starts with "#" or an http(s) address

  @test:schemas/graph.test.ts::every_link_stays_inside_bootstrap/_—_except_the_generated-by_notice's,_to_bootstrap-tools
  Scenario: every link stays inside bootstrap/ — except the generated-by notice's, to bootstrap-tools
    Given the links in bootstrap/README.md
    When links to the tools repository or its scripts are set aside
    Then no remaining link starts with "../", "/" or a URL scheme

  @test:schemas/graph.test.ts::every_relative_link_and_image_resolves_to_a_file_in_bootstrap/
  Scenario: every relative link and image resolves to a file in bootstrap/
    Given the links in bootstrap/README.md that have no URL scheme and are not bare anchors
    Then each, without its anchor, names a file that exists in bootstrap/

  @test:schemas/graph.test.ts::names_nothing_above_bootstrap
  Scenario: names nothing above bootstrap
    Then bootstrap/README.md matches none of the names of things above bootstrap

  @test:schemas/graph.test.ts::each_defined_term_is_linked_to_its_definition_once,_at_its_first_use
  Scenario: each defined term is linked to its definition once, at its first use
    Given the terms KnowledgeGraph, Subgraph, Harness, Actor, Role, Process and Skill
    Then bootstrap/README.md links each to its schemas/graph.schema.json definition exactly once

  @test:schemas/graph.test.ts::every_defined_term_in_the_prose_is_a_link_(owner,_2026-09-29)
  Scenario: every defined term in the prose is a link (owner, 2026-09-29)
    Given the hand-written prose of bootstrap/README.md, before its first generated region
    When it is searched for unlinked uses of the defined terms
    Then none is found

  @test:schemas/graph.test.ts::each_term_also_links_to_its_drawing,_and_the_drawing's_heading_exists
  Scenario: each term also links to its drawing, and the drawing's heading exists
    Given the headings and explicit anchors of bootstrap/schemas/README.md
    Then bootstrap/README.md has at least 7 links into schemas/README.md
    And each of those links lands on an existing heading or anchor
    And every term has an anchor on that page

  @test:schemas/graph.test.ts::no_file_in_bootstrap/_is_a_program
  Scenario: no file in bootstrap/ is a program
    When every file under bootstrap/ is listed
    Then none is a JavaScript, TypeScript, Python or shell file

  @test:schemas/graph.test.ts::only_the_listed_structural_names_remain
  Scenario: only the listed structural names remain
    Given every file under bootstrap/ except .git and the root index.config.json
    And the allowed mentions removed: the tools repository address, a README notice's bootstrap-tools link text, and a workflow's uses: address
    When each line is matched against the names above bootstrap, including bootstrap-tools
    Then the lines found are exactly the pending list, which is empty

  @test:schemas/graph.test.ts::every_kind_bootstrap's_declaration_uses_is_defined_in_bootstrap
  Scenario: every kind bootstrap's declaration uses is defined in bootstrap
    Then every graph typology named by a directory in bootstrap.json is one of BOOTSTRAP_GRAPH_TYPOLOGIES

  @test:schemas/graph.test.ts::every_kind_bootstrap_defines,_it_uses_—_no_definition_for_a_kind_it_does_not_hold
  Scenario: every kind bootstrap defines, it uses — no definition for a kind it does not hold
    Then every graph typology in BOOTSTRAP_GRAPH_TYPOLOGIES is named by some directory in bootstrap.json

  @test:schemas/graph.test.ts::each_file's_$schema_is_declared_in_bootstrap.json's_nodeSchemas
  Scenario: each file's $schema is declared in bootstrap.json's nodeSchemas
    When every JSON file under bootstrap/ (except .git and the root index.config.json) is read
    Then every string $schema it carries is a key of bootstrap.json's nodeSchemas

  @test:schemas/graph.test.ts::a_local_Node_Schema_exists_inside_bootstrap_and_fixes_that_very_tag
  Scenario: a local Node Schema exists inside bootstrap and fixes that very tag
    Given each nodeSchemas entry whose location is not an absolute URL
    Then its location is a file inside bootstrap/
    And that schema's $schema property is fixed to the entry's own tag

  @test:schemas/graph.test.ts::the_tag_that_used_to_name_the_platform_is_bootstrap's_own;_the_ledger's_left_with_the_ledger
  Scenario: the tag that used to name the platform is bootstrap's own; the ledger's left with the ledger
    Then nodeSchemas maps "model-registry/1.0.0" to "schemas/model-registry.schema.json"
    And nodeSchemas has no "glossary-ledger/1.0.0"

  @test:schemas/graph.test.ts::the_declaration_shape_knows_the_field
  Scenario: the declaration shape knows the field
    Then bootstrap.json parses under KnowledgeGraphDeclarationSchema
