import SwiftUI

@main
struct AbiballEinlassApp: App {
    @State private var model = AppModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .preferredColorScheme(.light)
                .tint(.black)
        }
    }
}

struct RootView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        Group {
            switch model.phase {
            case .starting:
                ProgressView().controlSize(.large)
            case .loggedOut:
                LoginView()
            case .loggedIn:
                MainView()
            }
        }
        .task { await model.start() }
    }
}
