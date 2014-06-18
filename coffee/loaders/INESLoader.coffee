AbstractLoader = require "./AbstractLoader"
Types          = require "../Types"

Mirroring = Types.Mirroring
TVSystem  = Types.TVSystem

INES_SIGNATURE = [ 0x4E, 0x45, 0x53, 0x1A ] # "NES^Z"

###########################################################
# Loader for the iNES ROM format
###########################################################

class INESLoader extends AbstractLoader

    @supportsInput: (reader) ->
        @containsSignature reader, INES_SIGNATURE

    readCartridge: ->
        @readHeader()   #  16 B [$0000-$000F]
        @readTrainer()  # 512 B (optional)
        @readPRGROM()   #  16KB x number of units
        @readCHRROM()   #   8KB x number of units

    ###########################################################
    # Header reading
    ###########################################################

    readHeader: ->
        @checkSignature INES_SIGNATURE # 4B [$00-$03]
        @readPRGROMSize()              # 1B [$04]
        @readCHRROMSize()              # 1B [$05]
        @readControlBytes()            # 2B [$06,$07]
        @readByte8()                   # 1B [$08]
        @readByte9()                   # 1B [$09]
        @readByte10()                  # 1B [$0A]
        @readByte11()                  # 1B [$0B]
        @readByte12()                  # 1B [$0C]
        @readByte13()                  # 1B [$0D]
        @readArray 2                   # 5B [$0E,$0F]

    readPRGROMSize: ->
        @cartridge.prgROMSize = @readByte() * 0x4000 # N x 16KB

    readCHRROMSize: ->
        @cartridge.chrROMSize = @readByte() * 0x2000 # N x 8KB
        @cartridge.hasCHRRAM = @cartridge.chrROMSize == 0

    readControlBytes: ->
        controlByte1 = @readByte()
        controlByte2 = @readByte()

        if controlByte1 & 0x08
            @cartridge.mirroring = Mirroring.FOUR_SCREEN
        else if controlByte1 & 0x01
            @cartridge.mirroring = Mirroring.VERTICAL
        else
            @cartridge.mirroring = Mirroring.HORIZONTAL

        @cartridge.hasPRGRAMBattery = (controlByte1 & 0x02) != 0
        @cartridge.hasTrainer = (controlByte1 & 0x04) != 0
        @cartridge.isVsUnisistem = (controlByte2 & 0x01) != 0
        @cartridge.isPlayChoice = (controlByte2 & 0x02) != 0
        @cartridge.mapperId = (controlByte2 & 0xF0) | (controlByte1 >>> 4)

    readByte8: ->
        unitsCount = Math.max 1, @readByte() # At least 1 unit (compatibility purposes)
        @cartridge.chrRAMSize = unitsCount * 0x2000 if @cartridge.hasCHRRAM # N x 8KB

    readByte9: ->
        flags = @readByte()
        @cartridge.tvSystem = if flags & 0x01 then TVSystem.PAL else TVSystem.NTSC

    readByte10: ->
        flags = @readByte()
        @cartridge.tvSystem = TVSystem.PAL if flags & 0x02 # Override previous value
        @cartridge.hasPRGRAM = (flags & 0x10) == 0
        @cartridge.hasBUSConflicts = (flags & 0x20) != 0

    readByte11: ->
        @readByte()

    readByte12: ->
        @readByte()

    readByte13: ->
        @readByte()

    ###########################################################
    # Data reading
    ###########################################################

    readTrainer: ->
        @cartridge.trainer = @readArray 0x200 if @cartridge.hasTrainer # 512B

    readPRGROM: ->
        @cartridge.prgROM = @readArray @cartridge.prgROMSize

    readCHRROM: ->
        @cartridge.chrROM = @readArray @cartridge.chrROMSize

module.exports = INESLoader