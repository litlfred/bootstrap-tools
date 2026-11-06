Feature: publish-site — any runner, any git remote (bootstrap-tools#7)

  Background:
    Given a fresh bare git remote whose gh-pages branch holds one stale file, stale.html
    And staged site directories built from the files each scenario names

  @test:scripts/publish-site.test.ts::a_full_replace:_the_staged_site_lands_and_a_file_it_does_not_hold_is_gone
  Scenario: a full replace: the staged site lands and a file it does not hold is gone
    When a site holding index.html and subgraph/v0/context.jsonld is published to the remote
    Then the result is published
    And gh-pages holds both files with their staged content
    And stale.html is gone

  @test:scripts/publish-site.test.ts::publishing_the_same_site_twice_is_`current`,_not_a_second_commit
  Scenario: publishing the same site twice is `current`, not a second commit
    When the same site is published twice
    Then the first result is published
    And the second result is current

  @test:scripts/publish-site.test.ts::an_empty_or_missing_site_is_refused,_never_published_over_the_branch
  Scenario: an empty or missing site is refused, never published over the branch
    When an empty site is published, and then a site directory that does not exist
    Then both fail
    And stale.html is still on gh-pages

  @test:scripts/publish-site.test.ts::an_unreachable_remote_fails_with_a_reason_rather_than_throwing
  Scenario: an unreachable remote fails with a reason rather than throwing
    When a site is published to a remote that does not exist, with one attempt
    Then the result is failed

  @test:scripts/publish-site.test.ts::--into_replaces_only_that_subtree:_the_root_and_other_previews_stay
  Scenario: --into replaces only that subtree: the root and other previews stay
    When sites are published into STAGING/a and STAGING/b, and then a different site into STAGING/a again
    Then each publish succeeds
    And stale.html remains at the root
    And STAGING/b/index.html is unchanged
    And STAGING/a holds only the newer site's fresh.html, not its old index.html

  @test:scripts/publish-site.test.ts::--keep:_a_full_replace_keeps_the_named_top-level_paths,_and_the_staged_site_cannot_overwrite_them
  Scenario: --keep: a full replace keeps the named top-level paths, and the staged site cannot overwrite them
    Given a preview published into STAGING/p
    When a full site that also holds a STAGING/p/index.html is published keeping STAGING
    Then the result is published
    And the root index.html is the new one and stale.html is gone
    And STAGING/p/index.html is still the preview's

  @test:scripts/publish-site.test.ts::an_--into_or_--keep_outside_the_branch,_or_both_at_once,_is_refused
  Scenario: an --into or --keep outside the branch, or both at once, is refused
    Then publishing into "../x", "/abs", ".", "a/../../b" or ".git" fails
    And keeping the nested path "a/b" fails
    And giving --into and --keep together fails
    And stale.html is still on gh-pages

  @test:scripts/publish-site.test.ts::only_what_a_publish_writes_is_checked_out:_kept_paths_and_other_previews_are_not
  Scenario: only what a publish writes is checked out: kept paths and other previews are not
    Then a full replace with nothing kept has no sparse patterns
    And publishing into "STAGING/a/" checks out only "/STAGING/a/"
    And keeping STAGING and branches checks out "/*" except "/STAGING/" and "/branches/"
