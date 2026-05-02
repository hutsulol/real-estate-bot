$ErrorActionPreference = 'Stop'

Write-Host 'Starting full rieltor enrichment...'
$env:RIELTOR_ENRICH_ALL = '1'
$env:RIELTOR_ENRICH_LIMIT = '20000'
$env:RIELTOR_USE_PLAYWRIGHT = '1'

npm.cmd run enrich:rieltor

Write-Host 'Done. Generating SQL check query:'
Write-Host "select count(*) as missing_count from apartments where source='rieltor' and (floor is null or floor_count is null or wall_type is null or heating_system is null or residential_complex is null);"
