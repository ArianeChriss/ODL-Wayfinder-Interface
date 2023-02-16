# Additional clean files
cmake_minimum_required(VERSION 3.16)

if("${CONFIG}" STREQUAL "" OR "${CONFIG}" STREQUAL "Release")
  file(REMOVE_RECURSE
  "CMakeFiles\\WayfinderConnect_autogen.dir\\AutogenUsed.txt"
  "CMakeFiles\\WayfinderConnect_autogen.dir\\ParseCache.txt"
  "WayfinderConnect_autogen"
  )
endif()
