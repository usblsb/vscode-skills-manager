import Cocoa

guard CommandLine.arguments.count >= 3 else {
    print("Uso: swift set_icon.swift <ruta_icono> <ruta_archivo>")
    exit(1)
}

let iconPath = CommandLine.arguments[1]
let targetPath = CommandLine.arguments[2]

guard let image = NSImage(contentsOfFile: iconPath) else {
    print("Error: No se pudo cargar el icono desde \(iconPath)")
    exit(1)
}

let success = NSWorkspace.shared.setIcon(image, forFile: targetPath, options: [])
if success {
    print("Icono asignado con exito a: \(targetPath)")
    exit(0)
} else {
    print("Error: No se pudo asignar el icono a \(targetPath)")
    exit(1)
}
