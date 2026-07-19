# Changelog

## [0.8.0](https://github.com/SebastianArce/tianguiswatt/compare/v0.7.0...v0.8.0) (2026-07-19)


### Features

* behind-the-meter solar in the dispatch engine ([#152](https://github.com/SebastianArce/tianguiswatt/issues/152)) ([4eb3d53](https://github.com/SebastianArce/tianguiswatt/commit/4eb3d5303944a3b3e8f77b046b4b3f91c8c41079))
* household consumption selector for the battery simulation ([#144](https://github.com/SebastianArce/tianguiswatt/issues/144)) ([ed05804](https://github.com/SebastianArce/tianguiswatt/commit/ed058048f009ab732c6f7c0f3ff409e39c2e72c4))
* ingest PV_Live national solar outturn ([#150](https://github.com/SebastianArce/tianguiswatt/issues/150)) ([b2473d4](https://github.com/SebastianArce/tianguiswatt/commit/b2473d4ed43be2096b5553622edee69c21c86191))
* solar capacity factor on the tariff decision row ([#151](https://github.com/SebastianArce/tianguiswatt/issues/151)) ([f473847](https://github.com/SebastianArce/tianguiswatt/commit/f4738475d4897e8e98a369dfae458709f3ede42e))


### Bug Fixes

* state the data sample behind Battery Lab charts ([#139](https://github.com/SebastianArce/tianguiswatt/issues/139)) ([4a4ea07](https://github.com/SebastianArce/tianguiswatt/commit/4a4ea07589dd036f50dc47009f23904ed22cab36))


### Documentation

* correct the prod backfill commands ([#140](https://github.com/SebastianArce/tianguiswatt/issues/140)) ([625f415](https://github.com/SebastianArce/tianguiswatt/commit/625f415848f257a8ec3ea45431685a86e1ee7789))

## [0.7.0](https://github.com/SebastianArce/tianguiswatt/compare/v0.6.0...v0.7.0) (2026-07-18)


### Features

* backfill carbon-intensity history ([#131](https://github.com/SebastianArce/tianguiswatt/issues/131)) ([781db66](https://github.com/SebastianArce/tianguiswatt/commit/781db668405b26b19e9f6ed0a5f171d7bb6105b7))
* battery dispatch simulation engine (greedy + LP, three strategies) ([#132](https://github.com/SebastianArce/tianguiswatt/issues/132)) ([82e380e](https://github.com/SebastianArce/tianguiswatt/commit/82e380eaa371f0d13e8fcf6812388800e8c3a81b))
* Battery Lab how-it-works tab ([#136](https://github.com/SebastianArce/tianguiswatt/issues/136)) ([f330545](https://github.com/SebastianArce/tianguiswatt/commit/f330545e1660bc97bad5f8070717ce0ce2c4460b))
* Battery Lab page with strategy comparison tab ([#135](https://github.com/SebastianArce/tianguiswatt/issues/135)) ([34f124d](https://github.com/SebastianArce/tianguiswatt/commit/34f124dc6f5ccd667003e1248c39f47d6c812a15))
* battery simulation API endpoints ([#134](https://github.com/SebastianArce/tianguiswatt/issues/134)) ([02c214f](https://github.com/SebastianArce/tianguiswatt/commit/02c214f31a8b4e3d5effb00a71da69755a3ad571))
* ingest Octopus Agile import/export tariff rates ([#126](https://github.com/SebastianArce/tianguiswatt/issues/126)) ([48e8e43](https://github.com/SebastianArce/tianguiswatt/commit/48e8e43e72b7153dd26b2c1f0096b65c70c0777e))
* model Agile tariff rates in dbt with carbon per half-hour ([#127](https://github.com/SebastianArce/tianguiswatt/issues/127)) ([027018f](https://github.com/SebastianArce/tianguiswatt/commit/027018fcd13e6939d6e12b09bbd2f307e26b6ea3))
* typical domestic demand profile (Elexon Class 1, TDCV-scaled) ([#130](https://github.com/SebastianArce/tianguiswatt/issues/130)) ([1a18d84](https://github.com/SebastianArce/tianguiswatt/commit/1a18d84d18bd4611ed7cea49187d15408ed84340))


### Bug Fixes

* build marts after tariff rates land each cycle ([#137](https://github.com/SebastianArce/tianguiswatt/issues/137)) ([248a30d](https://github.com/SebastianArce/tianguiswatt/commit/248a30dd4f4f1b16b22c01ee9482ee5e81d8f70e))
* season column in mart_domestic_profile lost its name to a qualified identifier ([#133](https://github.com/SebastianArce/tianguiswatt/issues/133)) ([ed6769e](https://github.com/SebastianArce/tianguiswatt/commit/ed6769e940dc205edc89363c36b79b583c08d887))

## [0.6.0](https://github.com/SebastianArce/tianguiswatt/compare/v0.5.1...v0.6.0) (2026-07-12)


### Features

* GitHub repo link in the header ([#117](https://github.com/SebastianArce/tianguiswatt/issues/117)) ([7315007](https://github.com/SebastianArce/tianguiswatt/commit/73150075e6b3c7135e2c37afc431d7c3db18abb1))

## [0.5.1](https://github.com/SebastianArce/tianguiswatt/compare/v0.5.0...v0.5.1) (2026-07-05)


### Bug Fixes

* ClickHouse concurrent-query 500s (shared session) ([#115](https://github.com/SebastianArce/tianguiswatt/issues/115)) ([c166a87](https://github.com/SebastianArce/tianguiswatt/commit/c166a87b8200bdb75032723cd8e8b847896653f5))

## [0.5.0](https://github.com/SebastianArce/tianguiswatt/compare/v0.4.0...v0.5.0) (2026-07-05)


### Features

* dark mode ([#114](https://github.com/SebastianArce/tianguiswatt/issues/114)) ([730e3c6](https://github.com/SebastianArce/tianguiswatt/commit/730e3c63ff62cebadfa54608dc6c0559203177eb))


### Documentation

* public architecture overview ([#10](https://github.com/SebastianArce/tianguiswatt/issues/10)) ([#96](https://github.com/SebastianArce/tianguiswatt/issues/96)) ([2362c95](https://github.com/SebastianArce/tianguiswatt/commit/2362c950f2a887695bc29914ea82ad24941e63d9))

## [0.4.0](https://github.com/SebastianArce/tianguiswatt/compare/v0.3.0...v0.4.0) (2026-07-05)


### Features

* graceful failure handling ([#110](https://github.com/SebastianArce/tianguiswatt/issues/110)) ([815a9d1](https://github.com/SebastianArce/tianguiswatt/commit/815a9d1c51aad68a05da73cd1e009c777303e85c))


### Bug Fixes

* complete the marts asset lineage ([#112](https://github.com/SebastianArce/tianguiswatt/issues/112)) ([305f504](https://github.com/SebastianArce/tianguiswatt/commit/305f5042bcd333f8837cac36dc4eaa1d1259be15))

## [0.3.0](https://github.com/SebastianArce/tianguiswatt/compare/v0.2.5...v0.3.0) (2026-07-04)


### Features

* freshness indicator on the data pages  ([#108](https://github.com/SebastianArce/tianguiswatt/issues/108)) ([b7b95bc](https://github.com/SebastianArce/tianguiswatt/commit/b7b95bc5346b59b00b94693e5d07782334310ed9))
* market-behaviour Trends page  ([#106](https://github.com/SebastianArce/tianguiswatt/issues/106)) ([3ec37ac](https://github.com/SebastianArce/tianguiswatt/commit/3ec37acb54782f52f02745c819984c52d4be548d))
* navigation restructure, Bid stack gets its own page  ([#105](https://github.com/SebastianArce/tianguiswatt/issues/105)) ([4b9408c](https://github.com/SebastianArce/tianguiswatt/commit/4b9408c3eced63aa83e89ee5c198ca4c5619f6bd))


### Bug Fixes

* headline wording + crowded time axis ([#104](https://github.com/SebastianArce/tianguiswatt/issues/104)) ([9421396](https://github.com/SebastianArce/tianguiswatt/commit/9421396285f8510ab6e453b42a742262c7159be0))
