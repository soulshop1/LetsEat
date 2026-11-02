import Foundation
import zlib

/// Minimal ZIP writer/reader using stored (uncompressed) entries — enough for MVP backup.
enum MinimalZip {
    struct Entry {
        var path: String
        var data: Data
    }

    static func create(entries: [Entry]) -> Data {
        var central = Data()
        var local = Data()
        var offset: UInt32 = 0
        let stamp = dosDateTime(Date())

        for entry in entries {
            let nameData = Data(entry.path.utf8)
            let crc = crc32(entry.data)
            let size = UInt32(entry.data.count)

            var localHeader = Data()
            localHeader.appendASCII("PK\u{03}\u{04}")
            localHeader.appendUInt16(20) // version needed
            localHeader.appendUInt16(0)  // flags
            localHeader.appendUInt16(0)  // method = store
            localHeader.appendUInt16(stamp.time)
            localHeader.appendUInt16(stamp.date)
            localHeader.appendUInt32(crc)
            localHeader.appendUInt32(size)
            localHeader.appendUInt32(size)
            localHeader.appendUInt16(UInt16(nameData.count))
            localHeader.appendUInt16(0)
            localHeader.append(nameData)
            localHeader.append(entry.data)
            local.append(localHeader)

            var centralHeader = Data()
            centralHeader.appendASCII("PK\u{01}\u{02}")
            centralHeader.appendUInt16(20)
            centralHeader.appendUInt16(20)
            centralHeader.appendUInt16(0)
            centralHeader.appendUInt16(0)
            centralHeader.appendUInt16(stamp.time)
            centralHeader.appendUInt16(stamp.date)
            centralHeader.appendUInt32(crc)
            centralHeader.appendUInt32(size)
            centralHeader.appendUInt32(size)
            centralHeader.appendUInt16(UInt16(nameData.count))
            centralHeader.appendUInt16(0)
            centralHeader.appendUInt16(0)
            centralHeader.appendUInt16(0)
            centralHeader.appendUInt16(0)
            centralHeader.appendUInt32(0)
            centralHeader.appendUInt32(offset)
            centralHeader.append(nameData)
            central.append(centralHeader)

            offset += UInt32(localHeader.count)
        }

        var end = Data()
        end.appendASCII("PK\u{05}\u{06}")
        end.appendUInt16(0)
        end.appendUInt16(0)
        end.appendUInt16(UInt16(entries.count))
        end.appendUInt16(UInt16(entries.count))
        end.appendUInt32(UInt32(central.count))
        end.appendUInt32(UInt32(local.count))
        end.appendUInt16(0)

        var zip = Data()
        zip.append(local)
        zip.append(central)
        zip.append(end)
        return zip
    }

    static func extract(data: Data) throws -> [Entry] {
        var entries: [Entry] = []
        var cursor = 0

        while cursor + 30 <= data.count {
            guard data[cursor] == 0x50, data[cursor + 1] == 0x4B,
                  data[cursor + 2] == 0x03, data[cursor + 3] == 0x04
            else { break }

            let method = Int(readUInt16(data, cursor + 8))
            let compSize = Int(readUInt32(data, cursor + 18))
            let nameLen = Int(readUInt16(data, cursor + 26))
            let extraLen = Int(readUInt16(data, cursor + 28))
            let nameStart = cursor + 30
            let nameEnd = nameStart + nameLen
            let dataStart = nameEnd + extraLen
            let dataEnd = dataStart + compSize
            guard dataEnd <= data.count,
                  let path = String(data: data.subdata(in: nameStart..<nameEnd), encoding: .utf8)
            else { break }

            let payload = data.subdata(in: dataStart..<dataEnd)
            if method == 0 {
                entries.append(Entry(path: path, data: payload))
            } else if method == 8 {
                entries.append(Entry(path: path, data: try inflateZlibOrRaw(payload)))
            } else {
                throw CocoaError(.fileReadCorruptFile)
            }
            cursor = dataEnd
        }
        return entries
    }

    private static func inflateZlibOrRaw(_ data: Data) throws -> Data {
        if let out = try? inflate(data, windowBits: -MAX_WBITS) { return out }
        return try inflate(data, windowBits: MAX_WBITS)
    }

    private static func inflate(_ data: Data, windowBits: Int32) throws -> Data {
        var stream = z_stream()
        var status = inflateInit2_(&stream, windowBits, ZLIB_VERSION, Int32(MemoryLayout<z_stream>.size))
        guard status == Z_OK else { throw CocoaError(.fileReadCorruptFile) }
        defer { inflateEnd(&stream) }

        var input = [UInt8](data)
        var output = Data()
        try input.withUnsafeMutableBufferPointer { inBuf in
            stream.next_in = inBuf.baseAddress
            stream.avail_in = uInt(inBuf.count)
            repeat {
                var chunk = [UInt8](repeating: 0, count: 64 * 1024)
                try chunk.withUnsafeMutableBufferPointer { outBuf in
                    stream.next_out = outBuf.baseAddress
                    stream.avail_out = uInt(outBuf.count)
                    status = inflate(&stream, Z_NO_FLUSH)
                    let produced = outBuf.count - Int(stream.avail_out)
                    output.append(contentsOf: outBuf.prefix(produced))
                }
            } while status == Z_OK
        }
        guard status == Z_STREAM_END else { throw CocoaError(.fileReadCorruptFile) }
        return output
    }

    private static func crc32(_ data: Data) -> UInt32 {
        data.withUnsafeBytes { raw in
            UInt32(zlib.crc32(0, raw.bindMemory(to: Bytef.self).baseAddress, uInt(data.count)))
        }
    }

    private static func dosDateTime(_ date: Date) -> (time: UInt16, date: UInt16) {
        let c = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute, .second], from: date)
        let time = UInt16(((c.hour ?? 0) << 11) | ((c.minute ?? 0) << 5) | ((c.second ?? 0) / 2))
        let year = max(0, (c.year ?? 1980) - 1980)
        let dosDate = UInt16((year << 9) | ((c.month ?? 1) << 5) | (c.day ?? 1))
        return (time, dosDate)
    }
}

private extension Data {
    mutating func appendASCII(_ string: String) {
        append(contentsOf: string.utf8)
    }

    mutating func appendUInt16(_ value: UInt16) {
        var v = value.littleEndian
        Swift.withUnsafeBytes(of: &v) { append(contentsOf: $0) }
    }

    mutating func appendUInt32(_ value: UInt32) {
        var v = value.littleEndian
        Swift.withUnsafeBytes(of: &v) { append(contentsOf: $0) }
    }
}

private func readUInt16(_ data: Data, _ offset: Int) -> UInt16 {
    data.subdata(in: offset..<(offset + 2)).withUnsafeBytes { $0.load(as: UInt16.self).littleEndian }
}

private func readUInt32(_ data: Data, _ offset: Int) -> UInt32 {
    data.subdata(in: offset..<(offset + 4)).withUnsafeBytes { $0.load(as: UInt32.self).littleEndian }
}
