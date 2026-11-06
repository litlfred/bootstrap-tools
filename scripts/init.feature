Feature: init — the steps the declarations name, in four states

  Background:
    Given a fake instance "demo" of repository someone/demo that needs "base" and declares a present "skills" directory and an absent "gone" directory, optionally with a Pages workflow and a sibling "base" checkout

  @test:scripts/init.test.ts::owner/repo_from_either_form
  Scenario: owner/repo from either form
    Then "litlfred/bootstrap" gives owner litlfred and repo bootstrap
    And "https://github.com/litlfred/bootstrap.git" gives the same
    And nothing gives nothing

  @test:scripts/init.test.ts::declared_directories,_needs_and_the_README_are_checked,_not_assumed
  Scenario: declared directories, needs and the README are checked, not assumed
    When init's steps are computed offline in a dry run for the instance without a workflow or base
    Then declaration is done
    And directory:skills is done and directory:gone is not-done
    And needs:base is not-done
    And readme is done
    And site:workflow is not-done

  @test:scripts/init.test.ts::site:workflow_—_a_publisher_in_the_TOOLSET_counts_only_when_it_checks_out_that_instance
  Scenario: site:workflow — a publisher in the TOOLSET counts only when it checks out that instance
    Given a toolset whose only workflow checks out someone/other and pushes gh-pages
    Then no Pages workflow is found for someone/demo
    When the toolset gains publish-demo.yml checking out someone/demo
    Then the Pages workflow found is "the toolset's .github/workflows/publish-demo.yml, publishing someone/demo"
    And with no owner/repo none is found

  @test:scripts/init.test.ts::a_needed_harness's_own_instructions_are_STATED,_never_done
  Scenario: a needed harness's own instructions are STATED, never done
    When init's steps are computed offline in a dry run for the instance with base beside it
    Then needs:base is done
    And instructions:base is stated

  @test:scripts/init.test.ts::no_gh:_Pages_is_could-not-determine,_with_the_one_manual_step_—_never_done,_never_silent
  Scenario: no gh: Pages is could-not-determine, with the one manual step — never done, never silent
    When init's steps are computed offline in a dry run for the instance with a workflow
    Then site:enabled is could-not-determine
    And its action is the enable-Pages-by-hand step for someone/demo, which names https://github.com/someone/demo/settings/pages
    And site:live is could-not-determine

  @test:scripts/init.test.ts::site:branch:_gh-pages_must_exist_before_Pages_can_be_on_—_and_init_never_creates_it_on_the_remote
  Scenario: site:branch: gh-pages must exist before Pages can be on — and init never creates it on the remote
    Given a signed-in gh whose Pages lookup answers 404 and which fails the test if asked to enable Pages
    And git reports no gh-pages branch
    When init's steps are computed for the instance with a workflow
    Then site:branch is not-done, with an action that mentions "--orphan gh-pages"
    And site:enabled is not-done
    And site:branch comes before site:enabled

  @test:scripts/init.test.ts::site:branch_without_git_is_could-not-determine
  Scenario: site:branch without git is could-not-determine
    When init's steps are computed offline in a dry run for the instance with a workflow
    Then site:branch is could-not-determine

  @test:scripts/init.test.ts::with_a_signed-in_gh,_gh-pages_present_and_Pages_off,_it_enables_Pages_serving_gh-pages,_then_checks_again
  Scenario: with a signed-in gh, gh-pages present and Pages off, it enables Pages serving gh-pages, then checks again
    Given a signed-in gh whose Pages lookup answers 404 until Pages is enabled, and serves gh-pages at / afterwards
    And git reports a gh-pages branch, and the site answers 404
    When init's steps are computed for the instance with a workflow
    Then site:enabled is done and was performed
    And gh was called to POST repos/someone/demo/pages with source branch gh-pages and path /
    And site:live is not-done

  @test:scripts/init.test.ts::--dry-run_never_enables_anything
  Scenario: --dry-run never enables anything
    Given a signed-in gh that fails the test if asked to enable Pages, and a gh-pages branch present
    When init's steps are computed in a dry run
    Then site:enabled is not-done

  @test:scripts/init.test.ts::exit_status:_not-done_outranks_could-not-determine,_which_is_never_0
  Scenario: exit status: not-done outranks could-not-determine, which is never 0
    Then the exit status of one done step is 0
    And of one could-not-determine step is 3
    And of a could-not-determine step with a not-done step is 1

  @test:scripts/init.test.ts::an_HTTP_answer:_404_is_not_there;_403,_407,_5xx_and_silence_are_about_the_way_here
  Scenario: an HTTP answer: 404 is not there; 403, 407, 5xx and silence are about the way here
    Then 200 and 301 are done
    And 404 is not-done
    And 403, 407, 503 and no answer are could-not-determine

  @test:scripts/init.test.ts::comes_right_after_the_declaration,_before_any_directory,_README_or_site_step
  Scenario: comes right after the declaration, before any directory, README or site step
    Given a git-initialised instance "kg" at version 0.1.0 with iriBase "https://o.github.io/kg/" and one schema whose $id is under its v0 address
    When init's steps are computed offline in a dry run
    Then the first three steps are declaration, schemas:staged and schemas:published
    And schemas:staged is done
    And schemas:published is could-not-determine

  @test:scripts/init.test.ts::a_404_is_not_published;_a_proxy's_403_could_not_be_determined;_200_is_done
  Scenario: a 404 is not published; a proxy's 403 could not be determined; 200 is done
    Given the same "kg" instance
    When every address answers 404, schemas:published is not-done
    When every address answers 403, schemas:published is could-not-determine
    When every address answers 200, schemas:published is done

  @test:scripts/init.test.ts::site:live_asks_the_README_page_too:_a_root_answering_over_a_missing_README.html_is_not_done
  Scenario: site:live asks the README page too: a root answering over a missing README.html is not done
    Given the same "kg" instance, with every address answering 200 except README.html, which answers 404
    When init's steps are computed in a dry run
    Then site:live is not-done
    And its detail says "README.html answered 404"

  @test:scripts/init.test.ts::site:live:_a_403_is_could-not-determine,_not_not-done
  Scenario: site:live: a 403 is could-not-determine, not not-done
    Given the same "kg" instance, with every address answering 403
    When init's steps are computed in a dry run
    Then site:live is could-not-determine
